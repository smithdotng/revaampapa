import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, referralLinks, wallet, type EarnRole } from '@/lib/earn'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Stat, StatGrid, Panel, EmptyState, StatusPill } from '@/components/dash/ui'
import { CopyLink } from '@/components/dash/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function EarnOverview({ role }: { role: EarnRole }) {
  const v = await requireRole(role)
  const base = earnBase(role)
  const me = v.doc._id
  const clickQuery = role === 'business_partner' ? { $or: [{ promoter: me }, { businessPartner: me }] } : { promoter: me }
  const [links, propertyClicks, hotelClicks, referralClicks, leads, recentLeads, topPromos, promoters, partners, hotelsIntroduced, hotelsOnboarded, vouchers] = await Promise.all([
    referralLinks(v),
    Models.ClickTracking.countDocuments({ promoter: me }),
    Models.HotelClick.countDocuments(clickQuery),
    Models.ReferralClick.countDocuments({ referrer: me }),
    Models.Interest.countDocuments({ promoter: me }),
    Models.Interest.find({ promoter: me }).populate('property', 'title').sort('-createdAt').limit(5).lean(),
    Models.Promotion.find({ promoter: me }).populate('property', 'title slug').sort({ clicks: -1, createdAt: -1 }).limit(5).lean(),
    Models.Referral.countDocuments({ referrer: me, type: 'promoter', referred: { $exists: true } }),
    Models.Referral.countDocuments({ referrer: me, type: 'business_partner', referred: { $exists: true } }),
    Models.HotelPartner.countDocuments({ promoter: me }),
    Models.PartnerHotel.countDocuments({ 'partnerProfile.onboardedByPromoter': me }),
    Models.VoucherSubscriber.countDocuments({ 'referral.referredBy': me }),
  ])
  const w = wallet(v.doc)
  const totalClicks = propertyClicks + hotelClicks + referralClicks

  const linkCards = [
    { title: 'Recruit promoters', earn: '70% residual income', url: links.promoter, linkType: 'referral', msg: 'Join me on RevaampAPA and earn up to 90% of the agency fee sharing verified property. Free to join:' },
    { title: 'Bring business partners', earn: role === 'business_partner' ? '20% of their admin fee' : '₦10,000 each', url: links.businessPartner, linkType: 'business_partner', msg: 'Become a RevaampAPA Business Partner — supply contracts, white-label tools and every promoter income stream:' },
    { title: 'Sign up Room Voucher subscribers', earn: '50% of the subscription', url: links.voucher, linkType: 'voucher', msg: 'Get cashback on hotel stays across the Revaamp directory with one Room Voucher membership:' },
    { title: 'Onboard partner hotels', earn: '30% of the hotel commission', url: links.hotel, linkType: 'hotel', msg: 'List your hotel on RevaampAPA and get your rooms off-taken by Revaamp:' },
  ]

  return (
    <>
      <DashHeader
        title={`Welcome, ${v.name.split(' ')[0]}`}
        intro="Share links, follow the clicks and leads they bring, and withdraw what you earn."
        actions={<Link href={`${base}/properties`} className="btn btn-primary"><Building2 className="size-4" aria-hidden /> Promote a property</Link>}
      />
      <StatGrid>
        <Stat label="Available to withdraw" value={naira(w.available)} hint={<Link href={`${base}/earnings`} className="underline underline-offset-2">Withdraw</Link>} accent />
        <Stat label="Total earned" value={naira(w.totalEarnings)} />
        <Stat label="Link clicks" value={totalClicks.toLocaleString()} hint={`${propertyClicks} property, ${hotelClicks} hotel, ${referralClicks} sign-up`} />
        <Stat label="Buyer leads" value={leads.toLocaleString()} hint={<Link href={`${base}/leads`} className="underline underline-offset-2">See leads</Link>} />
      </StatGrid>

      <Panel className="mt-6" title="Your sign-up links" intro="Anyone who registers through these is credited to you.">
        <div className="grid gap-6 md:grid-cols-2">
          {linkCards.map((l) => (
            <div key={l.title} className="grid content-start gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-sans text-[0.95rem] font-semibold tracking-normal">{l.title}</h3>
                <span className="text-xs font-semibold text-teal-ink">{l.earn}</span>
              </div>
              <CopyLink url={l.url} message={l.msg} track={{ linkType: l.linkType }} />
            </div>
          ))}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-center sm:grid-cols-4">
          {[[promoters, 'Promoters referred'], [partners, 'Partners referred'], [vouchers, 'Voucher subscribers'], [hotelsIntroduced + hotelsOnboarded, 'Hotels introduced']].map(([n, l]) => (
            <div key={l as string}><dd className="font-display text-2xl font-semibold">{n as number}</dd><dt className="text-xs text-muted">{l}</dt></div>
          ))}
        </dl>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Latest leads" action={<Link href={`${base}/leads`} className="text-sm font-medium text-teal-ink hover:text-ink">All leads</Link>} pad={false}>
          {recentLeads.length ? (
            <ul className="divide-y divide-line">
              {plain<any[]>(recentLeads).map((l) => (
                <li key={l._id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.name}</p><p className="truncate text-sm text-muted">{l.property?.title || 'General enquiry'}</p></div>
                  <span className="hidden text-sm text-muted sm:block">{formatDate(l.createdAt)}</span>
                  <StatusPill status={l.status} />
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No leads yet" body="When someone enquires about a property through your link, they appear here." action={<Link href={`${base}/properties`} className="btn btn-ghost">Get a property link</Link>} />}
        </Panel>
        <Panel title="Your best links" action={<Link href={`${base}/promotions`} className="text-sm font-medium text-teal-ink hover:text-ink">All links</Link>} pad={false}>
          {topPromos.length ? (
            <ul className="divide-y divide-line">
              {plain<any[]>(topPromos).map((p) => (
                <li key={p._id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <p className="min-w-0 flex-1 truncate font-medium">{p.property?.title || 'Removed property'}</p>
                  <span className="text-sm text-muted">{p.clicks || 0} clicks</span>
                  <span className="text-sm text-muted">{p.inquiries || 0} leads</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Share your first property" body="Pick a verified listing and we’ll make a link that tracks every click to you."
              action={<Link href={`${base}/properties`} className="btn btn-primary">Browse properties <ArrowRight className="size-4" aria-hidden /></Link>} />
          )}
        </Panel>
      </div>
    </>
  )
}
