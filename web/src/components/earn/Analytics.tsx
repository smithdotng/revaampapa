import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, type EarnRole } from '@/lib/earn'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, Table, Tabs, Stat, StatGrid, StatusPill } from '@/components/dash/ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tab = 'clicks' | 'shares' | 'referrals' | 'conversions'
const PERIODS: Record<string, number> = { week: 7, month: 30, year: 365 }
const device = (ua?: string) => !ua ? '—' : /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Other'

export async function EarnAnalytics({ role, tab = 'clicks', period = 'month' }: { role: EarnRole; tab?: Tab; period?: string }) {
  const v = await requireRole(role)
  const me = v.doc._id
  const since = period === 'all' ? new Date(2020, 0, 1) : new Date(Date.now() - (PERIODS[period] || 30) * 864e5)
  const hotelMine = role === 'business_partner' ? { $or: [{ promoter: me }, { businessPartner: me }] } : { promoter: me }
  const base = earnBase(role)
  const href = (t: string, p = period) => `${base}/analytics?tab=${t}&period=${p}`

  const [pc, hc, rc, shares, referred, tx] = await Promise.all([
    Models.ClickTracking.find({ promoter: me, clickedAt: { $gte: since } }).populate('property', 'title').sort('-clickedAt').limit(200).lean(),
    Models.HotelClick.find({ ...hotelMine, clickedAt: { $gte: since } }).populate('hotel', 'name').sort('-clickedAt').limit(200).lean(),
    Models.ReferralClick.find({ referrer: me, clickedAt: { $gte: since } }).sort('-clickedAt').limit(200).lean(),
    Models.ShareTracking.find({ promoter: me, sharedAt: { $gte: since } }).populate('propertyId', 'title').populate('hotelId', 'name').sort('-sharedAt').limit(300).lean(),
    Models.Referral.find({ referrer: me, referred: { $exists: true } }).populate('referred', 'name email userType createdAt').sort('-createdAt').limit(200).lean(),
    Models.Transaction.find({ promoter: me, paymentStatus: 'completed' }).populate('property', 'title').sort('-transactionDate').limit(200).lean(),
  ])
  const clicks = [
    ...plain<any[]>(pc).map((c) => ({ id: c._id, what: c.property?.title || 'Property', kind: 'Property', at: c.clickedAt, from: c.referrer, ua: c.userAgent })),
    ...plain<any[]>(hc).map((c) => ({ id: c._id, what: c.hotel?.name || 'Hotel', kind: 'Hotel', at: c.clickedAt, from: c.referrer, ua: c.userAgent })),
    ...plain<any[]>(rc).map((c) => ({ id: c._id, what: 'Promoter sign-up link', kind: 'Sign-up', at: c.clickedAt, from: c.referrerUrl, ua: c.userAgent })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at))
  const sh = plain<any[]>(shares)
  const counts: Record<string, number> = {}
  for (const s of sh) counts[s.platform] = (counts[s.platform] || 0) + 1
  const byPlatform = Object.entries(counts).sort((a, b) => b[1] - a[1])

  return (
    <>
      <DashHeader title="Activity" intro="Where your links are shared and who’s clicking."
        actions={
          <nav aria-label="Period" className="flex rounded-full border border-line-2 bg-white p-1">
            {[['week', '7 days'], ['month', '30 days'], ['year', '12 months'], ['all', 'All time']].map(([k, l]) => (
              <a key={k} href={href(tab, k)} aria-current={period === k ? 'page' : undefined} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted aria-[current=page]:bg-ink aria-[current=page]:text-white">{l}</a>
            ))}
          </nav>
        } />
      <StatGrid>
        <Stat label="Clicks" value={clicks.length} />
        <Stat label="Shares" value={sh.length} hint={byPlatform[0] ? `Mostly ${byPlatform[0][0]}` : undefined} />
        <Stat label="People referred" value={referred.length} hint="All time" />
        <Stat label="Completed deals" value={tx.length} hint="All time" />
      </StatGrid>
      <div className="mt-6">
        <Tabs items={[
          { label: 'Clicks', href: href('clicks'), active: tab === 'clicks', count: clicks.length },
          { label: 'Shares', href: href('shares'), active: tab === 'shares', count: sh.length },
          { label: 'Referrals', href: href('referrals'), active: tab === 'referrals', count: referred.length },
          { label: 'Deals', href: href('conversions'), active: tab === 'conversions', count: tx.length },
        ]} />
      </div>
      <Panel pad={false}>
        {tab === 'clicks' && (clicks.length ? (
          <Table head={['Link', 'Type', 'When', 'Device', 'Came from']}>
            {clicks.slice(0, 200).map((c) => <tr key={c.id}><td className="font-medium">{c.what}</td><td className="text-muted">{c.kind}</td><td>{formatDate(c.at)}</td><td className="text-muted">{device(c.ua)}</td><td className="max-w-[220px] truncate text-muted">{c.from && c.from !== 'direct' ? c.from : 'Direct / app'}</td></tr>)}
          </Table>
        ) : <EmptyState title="No clicks in this period" body="Share a link and clicks will show up here within seconds." />)}

        {tab === 'shares' && (sh.length ? (
          <>
            <div className="flex flex-wrap gap-2 border-b border-line px-6 py-4">
              {byPlatform.map(([p, n]) => <span key={p} className="rounded-full bg-paper px-3 py-1 text-sm"><strong className="capitalize">{p}</strong> {n}</span>)}
            </div>
            <Table head={['Shared', 'Where', 'When']}>
              {sh.map((s) => <tr key={s._id}><td className="font-medium">{s.propertyId?.title || s.hotelId?.name || s.linkType.replace('_', ' ')}</td><td className="capitalize text-muted">{s.platform}</td><td>{formatDate(s.sharedAt)}</td></tr>)}
            </Table>
          </>
        ) : <EmptyState title="No shares recorded in this period" body="Shares made with the buttons in your dashboard are counted here." />)}

        {tab === 'referrals' && (referred.length ? (
          <Table head={['Name', 'Joined as', 'Date', 'Status']}>
            {plain<any[]>(referred).map((r) => <tr key={r._id}><td className="font-medium">{r.referred?.name || '—'}</td><td className="text-muted">{r.type === 'business_partner' ? 'Business partner' : 'Promoter'}</td><td>{formatDate(r.createdAt)}</td><td><StatusPill status={r.status} /></td></tr>)}
          </Table>
        ) : <EmptyState title="No referrals yet" body="People who register with your sign-up links appear here." />)}

        {tab === 'conversions' && (tx.length ? (
          <Table head={['Property', 'Date', 'Deal value', 'Your commission']}>
            {plain<any[]>(tx).map((t) => <tr key={t._id}><td className="font-medium">{t.property?.title || '—'}</td><td>{formatDate(t.transactionDate)}</td><td>{naira(t.amount)}</td><td className="font-semibold">{naira(t.commissionSplit?.promoter?.amount || 0)}</td></tr>)}
          </Table>
        ) : <EmptyState title="No completed deals yet" body="When a sale through your link completes, your commission is recorded here." />)}
      </Panel>
    </>
  )
}
