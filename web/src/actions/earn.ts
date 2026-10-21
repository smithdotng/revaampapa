'use server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Models } from '@/lib/legacy'
import { requireRole } from '@/lib/guard'
import { setNotice } from '@/lib/notice'
import { earnBase, promotionFor, hotelLinkFor, wallet, type EarnRole } from '@/lib/earn'
import { type FormState, formValues, str, EMAIL } from '@/lib/form'
import { hasFile, type UploadInput, validateFile, saveUpload, UploadError } from '@/lib/uploads'

/* eslint-disable @typescript-eslint/no-explicit-any */

const PLATFORMS = ['whatsapp', 'facebook', 'twitter', 'linkedin', 'instagram', 'email', 'copy', 'other']
const LINK_TYPES = ['referral', 'property', 'hotel', 'voucher', 'business_partner', 'aggregator']
const isId = (s?: string) => !!s && /^[0-9a-f]{24}$/i.test(s)

export async function trackShare(input: { platform: string; link: string; linkType?: string; propertyId?: string; hotelId?: string; referralCode?: string }) {
  const v = await requireRole('promoter', 'business_partner')
  const h = await headers()
  const platform = PLATFORMS.includes(input.platform) ? input.platform : 'other'
  const linkType = input.propertyId ? 'property' : input.hotelId ? 'hotel' : LINK_TYPES.includes(input.linkType || '') ? input.linkType : 'referral'
  await new Models.ShareTracking({
    promoter: v.id,
    linkType,
    platform,
    link: String(input.link).slice(0, 500),
    propertyId: isId(input.propertyId) ? input.propertyId : undefined,
    hotelId: isId(input.hotelId) ? input.hotelId : undefined,
    referralCode: input.referralCode,
    ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: h.get('user-agent') || undefined,
    sharedAt: new Date(),
  }).save()
}

/** Create (or fetch) the tracked link for a property, for the "Get my link" button. */
export async function getPropertyLink(propertyId: string) {
  const v = await requireRole('promoter', 'business_partner')
  if (!isId(propertyId)) return { error: 'Unknown property' }
  const p = await Models.Property.findOne({ _id: propertyId, verificationStatus: 'verified', status: 'available' }).select('_id')
  if (!p) return { error: 'This property is no longer available.' }
  const { url, promo } = await promotionFor(v, propertyId)
  revalidatePath(`${earnBase(v.type as EarnRole)}/promotions`)
  return { url, code: promo.referralCode as string }
}

export async function introduceProperty(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('promoter', 'business_partner')
  const values = formValues(fd)
  const e: Record<string, string> = {}
  const title = str(fd, 'propertyTitle')
  const type = str(fd, 'propertyType')
  const ownerName = str(fd, 'ownerName')
  const ownerPhone = str(fd, 'ownerPhone')
  const ownerEmail = str(fd, 'ownerEmail')
  if (title.length < 5) e.propertyTitle = 'Describe the property in a few words.'
  if (!['land', 'building', 'shortlet', 'shop', 'business_complex'].includes(type)) e.propertyType = 'Choose a property type.'
  if (!str(fd, 'propertyLocation')) e.propertyLocation = 'Where is it?'
  if (!ownerName) e.ownerName = 'Enter the owner’s name.'
  if (ownerPhone.replace(/\D/g, '').length < 10) e.ownerPhone = 'Enter the owner’s phone number.'
  if (ownerEmail && !EMAIL.test(ownerEmail)) e.ownerEmail = 'Enter a valid email or leave it blank.'
  const docs = fd.getAll('documents').filter(hasFile) as UploadInput[]
  if (docs.length > 6) e.documents = 'Up to 6 files.'
  if (Object.keys(e).length) return { fieldErrors: e, values }
  try {
    docs.forEach((f, i) => validateFile(f, 'document', 10, `File ${i + 1}`))
    const urls = []
    for (const f of docs) urls.push((await saveUpload(f, 'properties', 'intro')).url)
    await new Models.PropertyIntroduction({
      promoter: v.id,
      title,
      propertyType: type,
      location: str(fd, 'propertyLocation'),
      value: parseFloat(str(fd, 'propertyValue')) || undefined,
      description: str(fd, 'propertyDescription'),
      owner: { name: ownerName, phone: ownerPhone, email: ownerEmail },
      documents: urls,
      status: 'pending',
      commissionRate: 40,
    }).save()
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[introduce property]', err)
    return { error: 'The introduction wasn’t saved. Please try again.', values }
  }
  await setNotice('success', 'Property introduced. Our team will contact the owner within 48 hours.')
  redirect(`${earnBase(v.type as EarnRole)}/submit-property?done=1`)
}

export async function introduceBuyer(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('promoter', 'business_partner')
  const values = formValues(fd)
  const e: Record<string, string> = {}
  const name = str(fd, 'buyerName')
  const phone = str(fd, 'buyerPhone')
  const email = str(fd, 'buyerEmail')
  const interested = str(fd, 'propertyInterested')
  if (!name) e.buyerName = 'Enter the buyer’s name.'
  if (phone.replace(/\D/g, '').length < 10) e.buyerPhone = 'Enter the buyer’s phone number.'
  if (email && !EMAIL.test(email)) e.buyerEmail = 'Enter a valid email or leave it blank.'
  if (!interested && !str(fd, 'locationPreference')) e.locationPreference = 'Pick a property or tell us what they’re looking for.'
  if (Object.keys(e).length) return { fieldErrors: e, values }
  await new Models.BuyerIntroduction({
    promoter: v.id,
    buyer: { name, phone, email },
    propertyInterested: isId(interested) ? interested : null,
    budget: parseFloat(str(fd, 'budget')) || null,
    locationPreference: str(fd, 'locationPreference'),
    message: str(fd, 'message'),
    status: 'pending',
    commissionRateBuyer: 90,
    commissionRateSeller: 50,
  }).save()
  await setNotice('success', 'Buyer introduced. We’ll match them with suitable properties and keep you posted.')
  redirect(`${earnBase(v.type as EarnRole)}/submit-buyer?done=1`)
}

export async function introduceHotel(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('promoter', 'business_partner')
  const values = formValues(fd)
  const e: Record<string, string> = {}
  if (!str(fd, 'hotelName')) e.hotelName = 'Enter the hotel’s name.'
  if (!str(fd, 'hotelLocation')) e.hotelLocation = 'Enter the city and state.'
  if (!str(fd, 'contactPerson')) e.contactPerson = 'Who should we speak to?'
  if (str(fd, 'contactPhone').replace(/\D/g, '').length < 10) e.contactPhone = 'Enter their phone number.'
  const email = str(fd, 'contactEmail')
  if (email && !EMAIL.test(email)) e.contactEmail = 'Enter a valid email or leave it blank.'
  if (Object.keys(e).length) return { fieldErrors: e, values }
  await new Models.HotelPartner({
    promoter: v.id,
    name: str(fd, 'hotelName'),
    location: str(fd, 'hotelLocation'),
    address: str(fd, 'hotelAddress'),
    contact: { name: str(fd, 'contactPerson'), phone: str(fd, 'contactPhone'), email },
    roomTypes: [],
    documents: [],
    status: 'pending',
    commissionRate: 30,
    promoterCommission: 30,
  }).save()
  await setNotice('success', 'Hotel introduced. Our team will contact them within 48 hours.')
  redirect(`${earnBase(v.type as EarnRole)}/onboard-hotel?done=1`)
}

export async function requestWithdrawal(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('promoter', 'business_partner')
  const amount = Math.floor(parseFloat(str(fd, 'amount')))
  const w = wallet(v.doc)
  if (!w.bank?.accountNumber) return { error: 'Add your payout account in Settings first.' }
  if (!amount || amount < 1) return { fieldErrors: { amount: 'Enter an amount to withdraw.' }, values: formValues(fd) }
  if (amount > w.available) return { fieldErrors: { amount: `You can withdraw up to ₦${w.available.toLocaleString('en-NG')}.` }, values: formValues(fd) }
  // Deduct first, then record the request superadmin processes
  const res = await Models.User.updateOne({ _id: v.id, 'promoterProfile.pendingWithdrawal': { $gte: amount } }, { $inc: { 'promoterProfile.pendingWithdrawal': -amount } })
  if (!res.modifiedCount) return { error: 'Your balance changed. Refresh and try again.' }
  try {
    await new Models.Withdrawal({ promoter: v.id, amount, bankDetails: { bankName: w.bank.bankName, accountNumber: w.bank.accountNumber, accountName: w.bank.accountName }, status: 'pending' }).save()
  } catch (err) {
    await Models.User.updateOne({ _id: v.id }, { $inc: { 'promoterProfile.pendingWithdrawal': amount } })
    console.error('[withdraw]', err)
    return { error: 'The request didn’t go through and your balance is unchanged. Please try again.' }
  }
  revalidatePath(`${earnBase(v.type as EarnRole)}/earnings`)
  return { ok: true, message: `Withdrawal of ₦${amount.toLocaleString('en-NG')} requested. We pay to ${w.bank.bankName} ••••${String(w.bank.accountNumber).slice(-4)}.` }
}

export async function updateInterestStatus(id: string, status: 'new' | 'contacted' | 'converted' | 'closed') {
  const v = await requireRole('promoter', 'business_partner')
  await Models.Interest.updateOne({ _id: id, promoter: v.id }, { status })
  revalidatePath(`${earnBase(v.type as EarnRole)}/leads`)
}

export async function placeBid(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('business_partner')
  const noticeId = str(fd, 'bidNoticeId')
  const lots = parseInt(str(fd, 'numberOfLots'), 10)
  if (!isId(noticeId)) return { error: 'Choose a bid notice.' }
  const notice = await Models.BidNotice.findById(noticeId)
  if (!notice || notice.status !== 'active') return { error: 'This bid notice is no longer open.' }
  if (new Date() > new Date(notice.deadline)) return { error: 'The deadline for this bid has passed.' }
  if (!lots || lots < 1) return { fieldErrors: { numberOfLots: 'Bid for at least one lot.' }, values: formValues(fd) }
  if (lots > notice.totalLots) return { fieldErrors: { numberOfLots: `Only ${notice.totalLots} lots are on offer.` }, values: formValues(fd) }
  await new Models.Bid({ bidNotice: noticeId, bidder: v.id, numberOfLots: lots, message: str(fd, 'message') }).save()
  revalidatePath('/business-partner/bid')
  return { ok: true, message: `Bid placed for ${lots} lot${lots > 1 ? 's' : ''} on ${notice.transactionNumber}. We’ll confirm your allocation.` }
}

export async function getHotelLink(hotelId: string) {
  const v = await requireRole('promoter', 'business_partner')
  if (!isId(hotelId)) return { error: 'Unknown hotel' }
  const h = await Models.Hotel.findOne({ _id: hotelId, isActive: true }).select('_id')
  if (!h) return { error: 'This hotel is no longer listed.' }
  const { url } = await hotelLinkFor(v, hotelId)
  return { url }
}
