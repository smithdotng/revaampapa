'use server'
import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Models, mongoose, sendLegacyEmail } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { setNotice } from '@/lib/notice'
import { sendMail, emailShell, esc } from '@/lib/mail'
import { baseUrl } from '@/lib/guard'
import { str } from '@/lib/form'
import { removeUpload } from '@/lib/uploads'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AdminResult = { ok?: boolean; error?: string; message?: string }

const isId = (v: string) => mongoose.isValidObjectId(v)
const ok = (message: string): AdminResult => ({ ok: true, message })
const fail = (error: string): AdminResult => ({ error })

function refresh(...paths: string[]) {
  revalidatePath('/superadmin', 'layout')
  for (const p of paths) revalidatePath(p)
}

/** Send a short branded email; mail problems never block the admin action. */
async function notify(to: string | undefined, subject: string, title: string, body: string) {
  if (!to) return false
  try {
    return await sendMail(to, subject, emailShell(title, body))
  } catch (err) {
    console.error('[admin mail]', subject, (err as Error).message)
    return false
  }
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0 8px"><a href="${href}" style="background:#03a6a6;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${label}</a></p>`

async function load(model: any, fd: FormData, what: string) {
  await requireAdmin()
  const id = str(fd, 'id')
  if (!isId(id)) return { doc: null, err: fail(`That ${what} wasn’t found.`) }
  const doc = await model.findById(id)
  if (!doc) return { doc: null, err: fail(`That ${what} wasn’t found. It may have been deleted.`) }
  return { doc, err: null }
}

/* ───────────────────────── Properties ───────────────────────── */

/** Who to email about a listing: the owner account, or the person a superadmin listed it for. */
async function listingContact(p: any) {
  if (p.listedBySuperadmin && p.externalOwner?.email) return { name: p.externalOwner.name, email: p.externalOwner.email }
  const u = await Models.User.findById(p.owner).select('name email').lean()
  return u ? { name: u.name, email: u.email } : null
}

export async function confirmPropertyPayment(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Property, fd, 'property')
  if (!p) return err!
  const v = await requireAdmin()
  p.verificationStatus = 'payment_confirmed'
  p.status = 'payment_confirmed'
  p.verificationPaymentConfirmed = true
  p.verificationPaymentConfirmedBy = v.id
  p.verificationPaymentConfirmedAt = new Date()
  await p.save()
  refresh(`/superadmin/properties/${p._id}`)
  return ok('Fee marked as received. The listing is now in the review queue.')
}

export async function verifyProperty(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Property, fd, 'property')
  if (!p) return err!
  const v = await requireAdmin()
  p.verificationStatus = 'verified'
  p.status = 'available'
  p.verificationFeedback = { message: str(fd, 'note') || 'Property verified successfully', providedBy: v.id, providedAt: new Date() }
  if (!p.verificationPaymentConfirmedBy) p.verificationPaymentConfirmedBy = v.id
  await p.save()
  const who = await listingContact(p)
  // The Express app passed the owner's id here instead of the owner, so this email never went out
  const emailed = who ? await sendLegacyEmail('sendPropertyVerifiedEmail', who, p) : false
  refresh(`/superadmin/properties/${p._id}`, '/properties', `/properties/${p.slug}`, '/')
  return ok(`“${p.title}” is live.${emailed ? ` ${who!.name} has been emailed.` : ''}`)
}

export async function rejectProperty(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Property, fd, 'property')
  if (!p) return err!
  const v = await requireAdmin()
  const reason = str(fd, 'reason')
  if (!reason) return fail('Tell the owner what needs fixing.')
  p.verificationStatus = 'rejected'
  p.status = 'rejected'
  p.verificationFeedback = { message: reason, providedBy: v.id, providedAt: new Date() }
  await p.save()
  const who = await listingContact(p)
  const emailed = who ? await sendLegacyEmail('sendPropertyRejectedEmail', who, p, reason) : false
  refresh(`/superadmin/properties/${p._id}`, '/properties', `/properties/${p.slug}`)
  return ok(`Listing sent back to the owner.${emailed ? ' They’ve been emailed your reason.' : ''}`)
}

export async function togglePropertyFeatured(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Property, fd, 'property')
  if (!p) return err!
  p.featured = !p.featured
  p.featuredExpiry = p.featured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
  await p.save()
  refresh(`/superadmin/properties/${p._id}`, '/')
  return ok(p.featured ? 'Featured on the home page for 30 days.' : 'Removed from featured listings.')
}

export async function setPropertyStatus(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Property, fd, 'property')
  if (!p) return err!
  const status = str(fd, 'status')
  if (!['available', 'sold', 'rented', 'unavailable'].includes(status)) return fail('Choose a status.')
  p.status = status
  await p.save()
  refresh(`/superadmin/properties/${p._id}`, '/properties')
  return ok('Availability updated.')
}

export async function deletePropertyAdmin(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Property, fd, 'property')
  if (!p) return err!
  for (const img of p.images || []) await removeUpload(img.url)
  await p.deleteOne()
  refresh('/superadmin/properties', '/properties')
  await setNotice('success', `“${p.title}” was deleted.`)
  redirect('/superadmin/properties')
}

/* ───────────────────────── Promoters & business partners ───────────────────────── */

export async function approvePromoter(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'promoter')
  if (!u) return err!
  u.promoterProfile = u.promoterProfile || {}
  u.promoterProfile.isApproved = true
  u.promoterProfile.approvalDate = new Date()
  u.promoterProfile.rejected = false
  u.promoterProfile.isActive = true
  await u.save()
  const emailed = await notify(u.email, 'Your promoter account is approved', 'You’re approved',
    `<p>Hello ${esc(u.name)},</p><p>Your RevaampAPA promoter account is ready. Sign in to get your links and start earning on every property you promote.</p>${button(`${baseUrl()}/login`, 'Sign in')}`)
  refresh('/superadmin/promoters')
  return ok(`${u.name} can now sign in.${emailed ? ' We’ve emailed them.' : ''}`)
}

export async function rejectPromoter(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'promoter')
  if (!u) return err!
  const reason = str(fd, 'reason') || 'Application rejected'
  u.promoterProfile = u.promoterProfile || {}
  u.promoterProfile.rejected = true
  u.promoterProfile.rejectionReason = reason
  u.promoterProfile.rejectionDate = new Date()
  u.promoterProfile.isApproved = false
  await u.save()
  refresh('/superadmin/promoters')
  return ok('Application declined.')
}

/** Suspend or restore any account in the users collection. */
export async function toggleUserSuspended(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'account')
  if (!u) return err!
  if (u.userType === 'superadmin') return fail('Superadmin accounts can’t be suspended here.')
  u.isSuspended = !u.isSuspended
  if (u.userType === 'promoter' || u.userType === 'business_partner') {
    u.promoterProfile = u.promoterProfile || {}
    u.promoterProfile.isActive = !u.isSuspended
    u.promoterProfile.suspendedAt = u.isSuspended ? new Date() : null
  }
  await u.save()
  // Sign them out everywhere
  if (u.isSuspended) {
    try {
      await mongoose.connection.db!.collection('sessions').deleteMany({ session: { $regex: `"userId":"${u._id}"` } })
    } catch {}
  }
  refresh('/superadmin/promoters', '/superadmin/business-partners', '/superadmin/property-owners', '/superadmin/project-subscribers')
  return ok(u.isSuspended ? `${u.name} is suspended and signed out.` : `${u.name} can sign in again.`)
}

export async function confirmPartnerPayment(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'business partner')
  if (!u) return err!
  const v = await requireAdmin()
  u.businessPartnerProfile = u.businessPartnerProfile || {}
  const bp = u.businessPartnerProfile
  bp.paymentStatus = 'confirmed'
  bp.paymentVerifiedBy = v.id
  bp.paymentVerifiedAt = new Date()
  bp.paymentNotes = str(fd, 'note') || bp.paymentNotes
  bp.isApproved = true
  bp.approvalDate = new Date()
  bp.rejected = false
  if (!bp.uniqueLink) bp.uniqueLink = crypto.randomBytes(8).toString('hex')
  u.promoterProfile = u.promoterProfile || {}
  u.promoterProfile.isApproved = true
  u.promoterProfile.isActive = true
  await u.save()
  const emailed = await notify(u.email, 'Your Business Partner account is active', 'Payment confirmed',
    `<p>Hello ${esc(u.name)},</p><p>We’ve confirmed your ₦${(bp.paymentAmount || 20000).toLocaleString('en-NG')} registration payment. Your Revaamp Business Partner dashboard is ready — promote properties and hotels, introduce deals and bid on value-partner notices.</p>${button(`${baseUrl()}/login`, 'Sign in')}`)
  refresh('/superadmin/business-partners')
  return ok(`${u.name} is now an active business partner.${emailed ? ' We’ve emailed them.' : ''}`)
}

export async function rejectPartnerPayment(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'business partner')
  if (!u) return err!
  const v = await requireAdmin()
  const reason = str(fd, 'reason')
  if (!reason) return fail('Say why the payment couldn’t be confirmed.')
  u.businessPartnerProfile = u.businessPartnerProfile || {}
  const bp = u.businessPartnerProfile
  bp.paymentStatus = 'rejected'
  bp.paymentNotes = reason
  bp.paymentVerifiedBy = v.id
  bp.paymentVerifiedAt = new Date()
  bp.rejected = true
  bp.rejectionReason = reason
  bp.rejectionDate = new Date()
  await u.save()
  const emailed = await notify(u.email, 'About your Business Partner payment', 'We couldn’t confirm your payment',
    `<p>Hello ${esc(u.name)},</p><p>We weren’t able to confirm your registration payment:</p><p style="padding:12px 16px;background:#f6f8f7;border-radius:8px">${esc(reason)}</p><p>Reply to this email with the correct proof of payment and we’ll take another look.</p>`)
  refresh('/superadmin/business-partners')
  return ok(`Payment marked as not confirmed.${emailed ? ' They’ve been emailed.' : ''}`)
}

/* ───────────────────────── Partner professionals ───────────────────────── */

const PRO = {
  architect: { model: () => Models.Architect, profile: 'architectProfile', label: 'Partner Architect' },
  solicitor: { model: () => Models.Solicitor, profile: 'partnerProfile', label: 'Partner Solicitor' },
  hbh: { model: () => Models.HectareSolicitor, profile: 'hectareProfile', label: 'HbH Solicitor' },
} as const

function proKind(fd: FormData) {
  const k = str(fd, 'kind') as keyof typeof PRO
  return PRO[k] ? k : null
}

export async function approveProfessional(fd: FormData): Promise<AdminResult> {
  const kind = proKind(fd)
  if (!kind) return fail('Unknown account type.')
  const cfg = PRO[kind]
  const { doc: d, err } = await load(cfg.model(), fd, 'application')
  if (!d) return err!
  const v = await requireAdmin()
  d[cfg.profile] = d[cfg.profile] || {}
  d[cfg.profile].isActive = true
  d[cfg.profile].approvedAt = new Date()
  if (kind !== 'hbh') d[cfg.profile].approvedBy = v.id
  if (kind === 'hbh') d[cfg.profile].rejectionReason = ''
  d.isSuspended = false
  d.suspensionReason = undefined
  await d.save()
  const emailed = await notify(d.email, `You’re approved as a ${cfg.label}`, 'Application approved',
    `<p>Hello ${esc(d.name)},</p><p>Your application to join RevaampAPA as a ${cfg.label} has been approved. Your dashboard is ready.</p>${button(`${baseUrl()}/login`, 'Sign in')}`)
  refresh('/superadmin/professionals')
  return ok(`${d.name} is approved.${emailed ? ' We’ve emailed them.' : ''}`)
}

export async function rejectProfessional(fd: FormData): Promise<AdminResult> {
  const kind = proKind(fd)
  if (!kind) return fail('Unknown account type.')
  const cfg = PRO[kind]
  const { doc: d, err } = await load(cfg.model(), fd, 'application')
  if (!d) return err!
  const reason = str(fd, 'reason') || 'Application rejected'
  d[cfg.profile] = d[cfg.profile] || {}
  d[cfg.profile].isActive = false
  if (kind === 'hbh') d[cfg.profile].rejectionReason = reason
  d.isSuspended = true
  d.suspensionReason = reason
  d.suspendedAt = new Date()
  await d.save()
  const emailed = await notify(d.email, `Your ${cfg.label} application`, 'About your application',
    `<p>Hello ${esc(d.name)},</p><p>Thank you for applying to join RevaampAPA as a ${cfg.label}. We’re not able to approve your application at this time:</p><p style="padding:12px 16px;background:#f6f8f7;border-radius:8px">${esc(reason)}</p>`)
  refresh('/superadmin/professionals')
  return ok(`Application declined.${emailed ? ' They’ve been emailed.' : ''}`)
}

/* ───────────────────────── Project subscribers & projects ───────────────────────── */

export async function activateSubscriber(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'subscriber')
  if (!u) return err!
  const plan = str(fd, 'plan')
  const months = parseInt(str(fd, 'months') || '12', 10)
  const p = (u.projectSubscriberProfile = u.projectSubscriberProfile || {})
  if (['basic', 'premium', 'enterprise'].includes(plan)) p.subscriptionPlan = plan
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + (months > 0 ? months : 12))
  p.subscriptionStatus = 'active'
  p.subscriptionDate = new Date()
  p.subscriptionExpiry = expiry
  p.isApproved = true
  p.approvalDate = new Date()
  const ref = str(fd, 'reference')
  if (ref) p.paymentHistory = [...(p.paymentHistory || []), { amount: Number(str(fd, 'amount')) || 0, date: new Date(), reference: ref, description: `${p.subscriptionPlan} subscription (manual)` }]
  await u.save()
  refresh('/superadmin/project-subscribers')
  return ok(`${u.name}’s ${p.subscriptionPlan} subscription is active until ${expiry.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}.`)
}

export async function setSubscriberGuarantee(fd: FormData): Promise<AdminResult> {
  const { doc: u, err } = await load(Models.User, fd, 'subscriber')
  if (!u) return err!
  const status = str(fd, 'status')
  if (!['approved', 'rejected'].includes(status)) return fail('Choose approve or reject.')
  const bg = u.projectSubscriberProfile?.bankGuarantee
  if (!bg?.referenceNumber) return fail('This subscriber hasn’t submitted a bank guarantee.')
  bg.status = status
  await u.save()
  const note = str(fd, 'reason')
  await notify(u.email, `Bank guarantee ${status}`, status === 'approved' ? 'Bank guarantee approved' : 'Bank guarantee not approved',
    `<p>Hello ${esc(u.name)},</p><p>Your bank guarantee (${esc(bg.referenceNumber)}) has been ${status}.</p>${note ? `<p style="padding:12px 16px;background:#f6f8f7;border-radius:8px">${esc(note)}</p>` : ''}${button(`${baseUrl()}/project-subscriber/bank-guarantee`, 'View details')}`)
  refresh('/superadmin/project-subscribers')
  return ok(`Bank guarantee ${status}.`)
}

export async function updateProject(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Project, fd, 'project')
  if (!p) return err!
  const v = await requireAdmin()
  const status = str(fd, 'status')
  const allowed = ['draft', 'pending_approval', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled']
  if (status && !allowed.includes(status)) return fail('Unknown status.')
  const before = p.status
  if (status) p.status = status
  const progress = str(fd, 'progress')
  if (progress !== '') {
    const n = Math.max(0, Math.min(100, parseInt(progress, 10)))
    if (Number.isFinite(n)) p.progress = n
  }
  const bg = str(fd, 'guarantee')
  if (bg && ['approved', 'rejected', 'pending'].includes(bg) && p.bankGuarantee) {
    p.bankGuarantee.status = bg
    p.bankGuarantee.verifiedBy = v.id
    p.bankGuarantee.verifiedAt = new Date()
  }
  if (status === 'completed' && !p.actualCompletionDate) p.actualCompletionDate = new Date()
  await p.save()
  if (status && status !== before) {
    const owner = await Models.User.findById(p.subscriber || p.owner || p.createdBy).select('name email').lean().catch(() => null)
    if (owner) await notify(owner.email, `Project update: ${p.title}`, 'Your project status changed',
      `<p>Hello ${esc(owner.name)},</p><p><strong>${esc(p.title)}</strong> is now <strong>${esc(status.replace(/_/g, ' '))}</strong>.</p>${button(`${baseUrl()}/project-subscriber/projects/${p.slug}`, 'Open project')}`)
  }
  refresh('/superadmin/projects')
  return ok('Project updated.')
}

/* ───────────────────────── Partner hotels & hotels ───────────────────────── */

export async function approvePartnerHotel(fd: FormData): Promise<AdminResult> {
  const { doc: partner, err } = await load(Models.PartnerHotel, fd, 'partner hotel')
  if (!partner) return err!
  const v = await requireAdmin()
  let listing = partner.partnerProfile?.listing ? await Models.Hotel.findById(partner.partnerProfile.listing) : null
  if (!listing) {
    listing = new Models.Hotel({
      name: partner.hotelName,
      description: partner.description,
      location: {
        address: partner.location?.address,
        city: partner.location?.city,
        state: partner.location?.state,
        country: partner.location?.country || 'Nigeria',
      },
      images: partner.images?.length ? partner.images : [],
      amenities: partner.amenities || [],
      contactInfo: { phone: partner.phone, email: partner.email, website: partner.website },
      commissionRate: partner.partnerProfile?.commissionRate || 30,
      rating: partner.starRating || 0,
      featured: partner.partnerProfile?.placementTier === 'featured',
      isActive: true,
      createdBy: v.id,
    })
  } else {
    listing.isActive = true
  }
  await listing.save()
  partner.partnerProfile.isActive = true
  partner.partnerProfile.approvedAt = new Date()
  partner.partnerProfile.approvedBy = v.id
  partner.partnerProfile.listing = listing._id
  partner.isSuspended = false
  partner.suspensionReason = undefined
  await partner.save()
  // Partner hotels have no dashboard — this email is their only notification
  const emailed = await sendLegacyEmail('sendPartnerHotelApprovedEmail', partner, listing)
  refresh('/superadmin/partner-hotels', '/hotels', `/hotels/${listing.slug}`)
  return ok(`${partner.hotelName} is live at /hotels/${listing.slug}.${emailed ? ' The hotel has been emailed.' : ''}`)
}

export async function rejectPartnerHotel(fd: FormData): Promise<AdminResult> {
  const { doc: partner, err } = await load(Models.PartnerHotel, fd, 'partner hotel')
  if (!partner) return err!
  const reason = str(fd, 'reason') || 'Application rejected'
  partner.partnerProfile.isActive = false
  partner.partnerProfile.rejectionReason = reason
  partner.isSuspended = true
  partner.suspensionReason = reason
  partner.suspendedAt = new Date()
  await partner.save()
  if (partner.partnerProfile?.listing) await Models.Hotel.updateOne({ _id: partner.partnerProfile.listing }, { isActive: false })
  refresh('/superadmin/partner-hotels', '/hotels')
  return ok('Declined. Any public listing has been taken down.')
}

export async function togglePartnerHotelFeatured(fd: FormData): Promise<AdminResult> {
  const { doc: partner, err } = await load(Models.PartnerHotel, fd, 'partner hotel')
  if (!partner) return err!
  const next = partner.partnerProfile?.placementTier === 'featured' ? 'standard' : 'featured'
  partner.partnerProfile.placementTier = next
  await partner.save()
  if (partner.partnerProfile?.listing) await Models.Hotel.updateOne({ _id: partner.partnerProfile.listing }, { featured: next === 'featured' })
  refresh('/superadmin/partner-hotels', '/hotels')
  return ok(next === 'featured' ? 'Moved to featured placement.' : 'Moved to standard placement.')
}

export async function toggleHotel(fd: FormData): Promise<AdminResult> {
  const { doc: h, err } = await load(Models.Hotel, fd, 'hotel')
  if (!h) return err!
  const field = str(fd, 'field')
  if (field === 'featured') h.featured = !h.featured
  else h.isActive = !h.isActive
  await h.save()
  refresh('/superadmin/hotels', '/hotels', `/hotels/${h.slug}`)
  return ok(field === 'featured' ? (h.featured ? 'Hotel featured.' : 'Hotel unfeatured.') : (h.isActive ? 'Hotel is visible again.' : 'Hotel hidden from the site.'))
}

export async function deleteHotel(fd: FormData): Promise<AdminResult> {
  const { doc: h, err } = await load(Models.Hotel, fd, 'hotel')
  if (!h) return err!
  // Images may be shared with a partner hotel application, so files are kept
  await h.deleteOne()
  refresh('/superadmin/hotels', '/hotels')
  await setNotice('success', `${h.name} was deleted.`)
  redirect('/superadmin/hotels')
}

/* ───────────────────────── Room Voucher ───────────────────────── */

export async function activateVoucherSubscriber(fd: FormData): Promise<AdminResult> {
  const { doc: s, err } = await load(Models.VoucherSubscriber, fd, 'subscriber')
  if (!s) return err!
  const v = await requireAdmin()
  const months = parseInt(str(fd, 'months'), 10)
  const now = new Date()
  s.subscription.status = 'active'
  s.subscription.startedAt = s.subscription.startedAt || now
  s.subscription.activatedAt = now
  s.subscription.activatedBy = v.id
  if (months > 0) {
    const exp = new Date(now)
    exp.setMonth(exp.getMonth() + months)
    s.subscription.expiresAt = exp
  } else {
    s.subscription.expiresAt = undefined
  }
  s.isSuspended = false
  s.suspensionReason = undefined
  await s.save()
  const emailed = await sendLegacyEmail('sendVoucherSubscriptionActivatedEmail', s)
  refresh('/superadmin/voucher-subscribers')
  return ok(`${s.name}’s Room Voucher is active.${emailed ? ' We’ve emailed them.' : ''}`)
}

export async function suspendVoucherSubscriber(fd: FormData): Promise<AdminResult> {
  const { doc: s, err } = await load(Models.VoucherSubscriber, fd, 'subscriber')
  if (!s) return err!
  const reason = str(fd, 'reason') || 'Suspended by administrator'
  s.isSuspended = true
  s.suspensionReason = reason
  s.suspendedAt = new Date()
  s.subscription.status = 'cancelled'
  s.subscription.cancelledAt = new Date()
  s.subscription.cancellationReason = reason
  await s.save()
  refresh('/superadmin/voucher-subscribers')
  return ok('Subscription suspended.')
}

export async function setReservationStatus(fd: FormData): Promise<AdminResult> {
  const { doc: r, err } = await load(Models.RoomVoucherReservation, fd, 'reservation')
  if (!r) return err!
  const status = str(fd, 'status')
  if (!['registered', 'confirmed', 'stayed', 'cancelled', 'no_show'].includes(status)) return fail('Unknown status.')
  r.status = status
  if (status === 'confirmed') r.confirmedAt = new Date()
  if (status === 'stayed') r.stayedAt = new Date()
  if (status === 'cancelled') r.cancelledAt = new Date()
  // The model voids cashback on cancelled / no_show
  await r.save()
  refresh('/superadmin/voucher-reservations')
  return ok('Reservation updated.')
}

export async function setReservationCashback(fd: FormData): Promise<AdminResult> {
  const { doc: r, err } = await load(Models.RoomVoucherReservation, fd, 'reservation')
  if (!r) return err!
  const v = await requireAdmin()
  const cashbackStatus = str(fd, 'cashbackStatus')
  if (!['pending', 'approved', 'paid', 'void'].includes(cashbackStatus)) return fail('Unknown cashback status.')
  if (cashbackStatus === 'approved') {
    r.cashbackApprovedAt = new Date()
    r.cashbackApprovedBy = v.id
  }
  if (cashbackStatus === 'paid') {
    r.cashbackPaidAt = new Date()
    r.cashbackPaidBy = v.id
    const ref = str(fd, 'reference')
    if (ref) r.cashbackPaymentReference = ref
  }
  r.cashbackStatus = cashbackStatus
  await r.save()
  let emailed = false
  if (cashbackStatus === 'paid') {
    await r.populate('subscriber', 'name email subscriberCode')
    await r.populate('hotel', 'name slug')
    if (r.subscriber) emailed = await sendLegacyEmail('sendVoucherCashbackPaidEmail', r.subscriber, r)
  }
  refresh('/superadmin/voucher-reservations')
  return ok(`Cashback marked ${cashbackStatus}.${emailed ? ' The subscriber has been emailed.' : ''}`)
}

/* ───────────────────────── Money ───────────────────────── */

export async function processWithdrawal(fd: FormData): Promise<AdminResult> {
  await requireAdmin()
  const id = str(fd, 'id')
  if (!isId(id)) return fail('Withdrawal not found.')
  const reference = str(fd, 'reference') || `WD-${Date.now()}`
  // Only a pending request can be paid, and only once
  const w = await Models.Withdrawal.findOneAndUpdate(
    { _id: id, status: { $in: ['pending', 'approved'] } },
    { status: 'processed', processedAt: new Date(), transactionReference: reference, adminNotes: str(fd, 'note') },
    { new: true },
  ).populate('promoter', 'name email')
  if (!w) return fail('This request has already been handled.')
  const u: any = w.promoter
  if (u?.email) {
    await notify(u.email, 'Your withdrawal has been paid', 'Withdrawal paid',
      `<p>Hello ${esc(u.name)},</p><p>We’ve paid ₦${w.amount.toLocaleString('en-NG')} to ${esc(w.bankDetails?.bankName || 'your bank')} ••••${esc(String(w.bankDetails?.accountNumber || '').slice(-4))}.</p><p>Reference: <strong>${esc(reference)}</strong></p>`)
  }
  refresh('/superadmin/withdrawals')
  return ok(`Marked as paid (ref ${reference}).`)
}

export async function rejectWithdrawal(fd: FormData): Promise<AdminResult> {
  await requireAdmin()
  const id = str(fd, 'id')
  if (!isId(id)) return fail('Withdrawal not found.')
  const reason = str(fd, 'reason') || 'Withdrawal request rejected'
  const w = await Models.Withdrawal.findOneAndUpdate(
    { _id: id, status: { $in: ['pending', 'approved'] } },
    { status: 'rejected', adminNotes: reason },
    { new: true },
  )
  if (!w) return fail('This request has already been handled.')
  // Return the money to their available balance
  await Models.User.updateOne({ _id: w.promoter }, { $inc: { 'promoterProfile.pendingWithdrawal': w.amount } })
  const u = await Models.User.findById(w.promoter).select('name email').lean()
  if (u) await notify(u.email, 'About your withdrawal request', 'Withdrawal not processed',
    `<p>Hello ${esc(u.name)},</p><p>Your request to withdraw ₦${w.amount.toLocaleString('en-NG')} wasn’t processed, and the amount is back in your available balance.</p><p style="padding:12px 16px;background:#f6f8f7;border-radius:8px">${esc(reason)}</p>`)
  refresh('/superadmin/withdrawals')
  return ok('Request declined and the amount returned to their balance.')
}

const pct = (k: string, d: number) => {
  const n = Number(process.env[k])
  return Number.isFinite(n) && n >= 0 ? n : d
}

/** Pay out a completed deal: credit the promoter once. */
async function creditPromoter(t: any) {
  if (!t.promoter || !t.commissionSplit?.promoter?.amount) return
  const amount = t.commissionSplit.promoter.amount
  await Models.User.updateOne(
    { _id: t.promoter },
    { $inc: { 'promoterProfile.totalEarnings': amount, 'promoterProfile.pendingWithdrawal': amount, 'referralStats.totalTransactions': 1 } },
  )
  const u = await Models.User.findById(t.promoter).select('name email')
  if (u) await sendLegacyEmail('sendCommissionPayoutEmail', u, amount, t)
}

export async function recordDeal(fd: FormData): Promise<AdminResult> {
  const v = await requireAdmin()
  const propertyId = str(fd, 'property')
  if (!isId(propertyId)) return fail('Choose the property.')
  const property = await Models.Property.findById(propertyId)
  if (!property) return fail('That property wasn’t found.')
  const amount = Number(str(fd, 'amount'))
  if (!(amount > 0)) return fail('Enter the deal amount.')
  const agencyFee = str(fd, 'agencyFee') ? Number(str(fd, 'agencyFee')) : Math.round(amount * 0.1)
  if (!(agencyFee >= 0)) return fail('Enter the agency fee.')
  const promoterId = str(fd, 'promoter')
  if (promoterId && !isId(promoterId)) return fail('Choose a valid promoter.')
  const pP = promoterId ? pct('PROMOTER_COMMISSION', 70) : 0
  const pO = pct('OWNER_COMMISSION', 10)
  const pPl = Math.max(0, 100 - pP - pO)
  const type = ['sale', 'rent', 'lease'].includes(str(fd, 'transactionType')) ? str(fd, 'transactionType') : property.transactionType
  const completed = str(fd, 'paymentStatus') === 'completed'
  const share = (p: number) => Math.round((agencyFee * p) / 100)
  const t = await new Models.Transaction({
    property: property._id,
    buyer: { name: str(fd, 'buyerName'), email: str(fd, 'buyerEmail'), phone: str(fd, 'buyerPhone') },
    promoter: promoterId || undefined,
    transactionType: type,
    amount,
    agencyFee,
    commissionSplit: {
      promoter: { percentage: pP, amount: share(pP) },
      platform: { percentage: pPl, amount: agencyFee - share(pP) - share(pO) },
      propertyOwner: { percentage: pO, amount: share(pO) },
    },
    paymentStatus: completed ? 'completed' : 'pending',
    paymentReference: str(fd, 'reference') || undefined,
    transactionDate: str(fd, 'date') ? new Date(str(fd, 'date')) : new Date(),
    completedDate: completed ? new Date() : undefined,
    notes: [str(fd, 'notes'), `Recorded by ${v.name}`].filter(Boolean).join(' · '),
  }).save()
  if (completed) await creditPromoter(t)
  if (str(fd, 'markProperty') === 'on') {
    property.status = type === 'sale' ? 'sold' : 'rented'
    await property.save()
  }
  refresh('/superadmin/transactions')
  return ok(completed ? 'Deal recorded and commissions credited.' : 'Deal recorded as pending. Mark it complete once the fee is received.')
}

export async function setTransactionStatus(fd: FormData): Promise<AdminResult> {
  await requireAdmin()
  const id = str(fd, 'id')
  const status = str(fd, 'status')
  if (!isId(id) || !['completed', 'failed'].includes(status)) return fail('Unknown request.')
  // Guard so a deal is only ever credited once
  const t = await Models.Transaction.findOneAndUpdate(
    { _id: id, paymentStatus: 'pending' },
    { paymentStatus: status, ...(status === 'completed' ? { completedDate: new Date() } : {}) },
    { new: true },
  )
  if (!t) return fail('This deal is no longer pending.')
  if (status === 'completed') await creditPromoter(t)
  refresh('/superadmin/transactions', `/superadmin/transactions/${id}`)
  return ok(status === 'completed' ? 'Deal completed and commission credited.' : 'Deal marked as failed.')
}

/* ───────────────────────── Enquiries ───────────────────────── */

export async function setInquiriesStatus(fd: FormData): Promise<AdminResult> {
  await requireAdmin()
  const ids = fd.getAll('ids').map(String).filter(isId)
  const status = str(fd, 'status')
  if (!ids.length) return fail('Select at least one enquiry.')
  if (!['new', 'read', 'replied', 'archived', 'spam'].includes(status)) return fail('Unknown status.')
  const r = await Models.Inquiry.updateMany({ _id: { $in: ids } }, { status })
  refresh('/superadmin/inquiries')
  return ok(`${r.modifiedCount} enquir${r.modifiedCount === 1 ? 'y' : 'ies'} updated.`)
}

export async function deleteInquiries(fd: FormData): Promise<AdminResult> {
  await requireAdmin()
  const ids = fd.getAll('ids').map(String).filter(isId)
  if (!ids.length) return fail('Select at least one enquiry.')
  const r = await Models.Inquiry.deleteMany({ _id: { $in: ids } })
  refresh('/superadmin/inquiries')
  if (str(fd, 'back')) {
    await setNotice('success', 'Enquiry deleted.')
    redirect('/superadmin/inquiries')
  }
  return ok(`${r.deletedCount} deleted.`)
}

/* ───────────────────────── Blog ───────────────────────── */

export async function toggleBlogFeatured(fd: FormData): Promise<AdminResult> {
  const { doc: b, err } = await load(Models.Blog, fd, 'post')
  if (!b) return err!
  b.featured = !b.featured
  await b.save()
  refresh('/superadmin/blogs', '/blog')
  return ok(b.featured ? 'Post featured.' : 'Post unfeatured.')
}

export async function deleteBlog(fd: FormData): Promise<AdminResult> {
  const { doc: b, err } = await load(Models.Blog, fd, 'post')
  if (!b) return err!
  await b.deleteOne()
  await removeUpload(b.featuredImage)
  refresh('/superadmin/blogs', '/blog')
  await setNotice('success', `“${b.title}” was deleted.`)
  redirect('/superadmin/blogs')
}

/* ───────────────────────── Bid notices ───────────────────────── */

export async function closeBidNotice(fd: FormData): Promise<AdminResult> {
  const { doc: n, err } = await load(Models.BidNotice, fd, 'bid notice')
  if (!n) return err!
  n.status = n.status === 'closed' ? 'active' : 'closed'
  await n.save()
  refresh('/superadmin/bid-notices', '/business-partner/bid')
  return ok(n.status === 'closed' ? 'Bidding closed.' : 'Bidding reopened.')
}

export async function deleteBidNotice(fd: FormData): Promise<AdminResult> {
  const { doc: n, err } = await load(Models.BidNotice, fd, 'bid notice')
  if (!n) return err!
  await Models.Bid.deleteMany({ bidNotice: n._id })
  await n.deleteOne()
  refresh('/superadmin/bid-notices', '/business-partner/bid')
  await setNotice('success', `Bid notice ${n.transactionNumber} and its bids were deleted.`)
  redirect('/superadmin/bid-notices')
}

export async function setBidStatus(fd: FormData): Promise<AdminResult> {
  const { doc: b, err } = await load(Models.Bid, fd, 'bid')
  if (!b) return err!
  const status = str(fd, 'status')
  if (!['approved', 'rejected', 'pending'].includes(status)) return fail('Unknown status.')
  b.status = status
  b.adminNote = str(fd, 'note') || b.adminNote
  await b.save()
  const u = await Models.User.findById(b.bidder).select('name email').lean()
  const n = await Models.BidNotice.findById(b.bidNotice).select('transactionNumber').lean()
  if (u && status !== 'pending') {
    await notify(u.email, `Your bid on ${n?.transactionNumber || 'a bid notice'}`, status === 'approved' ? 'Bid allocated' : 'Bid not allocated',
      `<p>Hello ${esc(u.name)},</p><p>Your bid for ${b.numberOfLots} lot${b.numberOfLots > 1 ? 's' : ''} on ${esc(n?.transactionNumber || '')} has been ${status === 'approved' ? 'allocated' : 'declined'}.</p>${b.adminNote ? `<p style="padding:12px 16px;background:#f6f8f7;border-radius:8px">${esc(b.adminNote)}</p>` : ''}`)
  }
  refresh(`/superadmin/bid-notices/${b.bidNotice}`, '/business-partner/bid')
  return ok(`Bid ${status}.`)
}

export async function postProjectUpdate(fd: FormData): Promise<AdminResult> {
  const { doc: p, err } = await load(Models.Project, fd, 'project')
  if (!p) return err!
  const v = await requireAdmin()
  const title = str(fd, 'title')
  const content = str(fd, 'content')
  if (!title || !content) return fail('Add a title and the update itself.')
  p.updates = [...(p.updates || []), { title, content, images: [], postedBy: v.id, postedAt: new Date() }]
  await p.save()
  const owner = await Models.User.findById(p.subscriber).select('name email').lean().catch(() => null)
  if (owner) await notify(owner.email, `New update on ${p.title}`, title,
    `<p>Hello ${esc(owner.name)},</p><p style="white-space:pre-wrap">${esc(content)}</p>${button(`${baseUrl()}/project-subscriber/projects/${p.slug}/updates`, 'See all updates')}`)
  refresh('/superadmin/projects', `/project-subscriber/projects/${p.slug}`)
  return ok('Update posted and emailed to the subscriber.')
}

export async function replyToInquiryAdmin(fd: FormData): Promise<AdminResult> {
  const { doc: q, err } = await load(Models.Inquiry, fd, 'enquiry')
  if (!q) return err!
  const v = await requireAdmin()
  const reply = str(fd, 'reply')
  if (reply.length < 5) return fail('Write a reply first.')
  const property = await Models.Property.findById(q.property).select('title').lean()
  const sent = await notify(q.email, `Re: ${property?.title || 'your enquiry'} on RevaampAPA`, 'Reply to your enquiry',
    `<p>Hello ${esc(q.name)},</p><p style="white-space:pre-wrap">${esc(reply)}</p><p style="color:#64716e;font-size:13px;border-top:1px solid #dde3e0;padding-top:12px;margin-top:20px">The RevaampAPA team${property?.title ? ` · about “${esc(property.title)}”` : ''}</p>`)
  if (!sent) return fail('The reply couldn’t be emailed. Check the mail settings and try again.')
  q.replyMessage = reply
  q.repliedAt = new Date()
  q.repliedBy = v.id
  q.status = 'replied'
  q.isRead = true
  q.readAt = q.readAt || new Date()
  await q.save()
  refresh('/superadmin/inquiries', `/superadmin/inquiries/${q._id}`)
  return ok(`Reply emailed to ${q.email}.`)
}

export async function addInquiryNoteAdmin(fd: FormData): Promise<AdminResult> {
  const { doc: q, err } = await load(Models.Inquiry, fd, 'enquiry')
  if (!q) return err!
  const v = await requireAdmin()
  const note = str(fd, 'note')
  if (!note) return fail('Write a note first.')
  q.notes.push({ note, addedBy: v.id, addedAt: new Date() })
  await q.save()
  refresh(`/superadmin/inquiries/${q._id}`)
  return ok('Note added.')
}
