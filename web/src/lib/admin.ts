import 'server-only'
import { cache } from 'react'
import { Models } from './legacy'
import { requireRole } from './guard'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const requireAdmin = () => requireRole('superadmin')

export const PAGE = 20

export function pageOf(v?: string) {
  const n = parseInt(v || '1', 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Escape user text before using it in a $regex. */
export function rx(s: string) {
  return { $regex: s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
}

export const PENDING = {
  property: { verificationStatus: 'payment_confirmed' },
  promoter: { userType: 'promoter', 'promoterProfile.isApproved': false, 'promoterProfile.rejected': { $ne: true } },
  partner: {
    userType: 'business_partner',
    'businessPartnerProfile.paymentStatus': { $nin: ['confirmed', 'rejected'] },
    'promoterProfile.paymentStatus': { $ne: 'confirmed' },
  },
  // Subscribers activate themselves through Paystack; what waits on the admin is their bank guarantee
  subscriber: { userType: 'project_subscriber', 'projectSubscriberProfile.bankGuarantee.status': 'pending', 'projectSubscriberProfile.bankGuarantee.referenceNumber': { $exists: true, $nin: [null, ''] } },
  architect: { 'architectProfile.isActive': { $ne: true }, isSuspended: { $ne: true } },
  solicitor: { 'partnerProfile.isActive': { $ne: true }, isSuspended: { $ne: true } },
  hbh: { 'hectareProfile.isActive': { $ne: true }, 'hectareProfile.rejectionReason': { $in: [null, ''] } },
  partnerHotel: { 'partnerProfile.isActive': false, isSuspended: { $ne: true } },
  voucher: { 'subscription.status': 'pending', isSuspended: { $ne: true } },
  withdrawal: { status: 'pending' },
  inquiry: { status: 'new' },
  project: { status: 'pending_approval' },
} as const

const count = (m: any, q: object) => m.countDocuments(q).catch(() => 0) as Promise<number>

/** Work waiting on the admin, shown as badges in the sidebar and on the overview. */
export const adminCounts = cache(async () => {
  const [property, promoter, partner, subscriber, architect, solicitor, hbh, partnerHotel, voucher, withdrawal, inquiry, project] = await Promise.all([
    count(Models.Property, PENDING.property),
    count(Models.User, PENDING.promoter),
    count(Models.User, PENDING.partner),
    count(Models.User, PENDING.subscriber),
    count(Models.Architect, PENDING.architect),
    count(Models.Solicitor, PENDING.solicitor),
    count(Models.HectareSolicitor, PENDING.hbh),
    count(Models.PartnerHotel, PENDING.partnerHotel),
    count(Models.VoucherSubscriber, PENDING.voucher),
    count(Models.Withdrawal, PENDING.withdrawal),
    count(Models.Inquiry, PENDING.inquiry),
    count(Models.Project, PENDING.project),
  ])
  return { property, promoter, partner, subscriber, professionals: architect + solicitor + hbh, architect, solicitor, hbh, partnerHotel, voucher, withdrawal, inquiry, project }
})

export type AdminCounts = Awaited<ReturnType<typeof adminCounts>>

/** Build a query string, dropping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Filters shared by the enquiries list and its CSV export. */
export function inquiryQuery(sp: { status?: string; q?: string; from?: string; to?: string }) {
  const query: any = {}
  if (sp.status) query.status = sp.status
  if (sp.q) query.$or = [{ name: rx(sp.q) }, { email: rx(sp.q) }, { phone: rx(sp.q) }, { message: rx(sp.q) }]
  if (sp.from || sp.to) {
    query.createdAt = {}
    if (sp.from) query.createdAt.$gte = new Date(sp.from)
    if (sp.to) query.createdAt.$lte = new Date(new Date(sp.to).getTime() + 86400000)
  }
  return query
}

