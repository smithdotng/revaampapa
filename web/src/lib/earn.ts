import 'server-only'
import crypto from 'node:crypto'
import { Models } from './legacy'
import { baseUrl, type Viewer } from './guard'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type EarnRole = 'promoter' | 'business_partner'
export const earnBase = (t: EarnRole) => (t === 'promoter' ? '/promoter' : '/business-partner')

/**
 * Promoters and business partners share one wallet: promoterProfile.
 * It's where registration writes, where the Express withdraw flow deducts,
 * and where superadmin refunds rejected withdrawals.
 */
export function wallet(doc: any) {
  const p = doc.promoterProfile || {}
  return {
    totalEarnings: p.totalEarnings || 0,
    available: p.pendingWithdrawal || 0,
    bank: p.bankDetails?.accountNumber ? p.bankDetails : doc.businessPartnerProfile?.bankDetails,
  }
}

/** The code partner-hotel and voucher registrations resolve back to this account. */
export async function ensureUniqueLink(v: Viewer): Promise<string> {
  const key = v.type === 'business_partner' ? 'businessPartnerProfile' : 'promoterProfile'
  const doc = v.doc
  if (!doc[key]) doc[key] = {}
  if (!doc[key].uniqueLink) {
    doc[key].uniqueLink = crypto.randomBytes(8).toString('hex')
    await doc.save()
  }
  return doc[key].uniqueLink
}

/** All the account-level links a promoter or partner can share. */
export async function referralLinks(v: Viewer) {
  const b = baseUrl()
  const code = await ensureUniqueLink(v)
  return {
    promoter: `${b}/referral/track/PROMO-${v.id}`,
    businessPartner: `${b}/business-partner/register?ref=${v.id}`,
    voucher: `${b}/voucher/register?ref=${v.id}`,
    hotel: `${b}/partner-hotel/register?ref=${code}`,
  }
}

/** Find or create this account's tracked link for one property. */
export async function promotionFor(v: Viewer, propertyId: string) {
  let promo = await Models.Promotion.findOne({ promoter: v.id, property: propertyId })
  if (!promo) {
    const random = crypto.randomBytes(3).toString('hex').toUpperCase()
    const code = `RVMP-${v.id.slice(-6).toUpperCase()}-${propertyId.slice(-6).toUpperCase()}-${random}`
    promo = await new Models.Promotion({ promoter: v.id, property: propertyId, referralCode: code, referralLink: `${baseUrl()}/r/${code}` }).save()
  }
  return { promo, url: `${baseUrl()}/r/${promo.referralCode}` }
}

/** Find or create this account's tracked link for one hotel. */
export async function hotelLinkFor(v: Viewer, hotelId: string) {
  const key = v.type === 'business_partner' ? 'businessPartnerProfile' : 'promoterProfile'
  const doc = v.doc
  if (!doc[key]) doc[key] = {}
  if (!doc[key].uniqueLinks) doc[key].uniqueLinks = []
  let link = doc[key].uniqueLinks.find((l: any) => l.hotelId && String(l.hotelId) === hotelId)
  if (!link) {
    link = { code: crypto.randomBytes(16).toString('hex'), hotelId, createdAt: new Date() }
    doc[key].uniqueLinks.push(link)
    await doc.save()
  }
  return { code: link.code as string, url: `${baseUrl()}/hotels/track/${hotelId}/${link.code}` }
}

export function shareMessage(p: { title: string; price: number; transactionType: string; location?: { city?: string; state?: string } }) {
  const price = `₦${Math.round(p.price).toLocaleString('en-NG')}${p.transactionType === 'rent' ? '/year' : ''}`
  const where = [p.location?.city, p.location?.state].filter(Boolean).join(', ')
  return `🏠 ${p.title}${where ? `\n📍 ${where}` : ''}\n💰 ${price}\n\nVerified on RevaampAPA. See photos and details:`
}
