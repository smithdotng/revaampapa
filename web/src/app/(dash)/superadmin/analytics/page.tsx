import type { Metadata } from 'next'
import Link from 'next/link'
import { Models } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, PROPERTY_TYPES } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, Bars, Tabs, Table, EmptyState } from '@/components/dash/ui'

export const metadata: Metadata = { title: 'Analytics' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type Period = 'weeks' | 'months'

const USER_LABEL: Record<string, string> = {
  property_owner: 'Property owners', promoter: 'Promoters', business_partner: 'Business partners',
  project_subscriber: 'Project subscribers', superadmin: 'Admins', agent: 'Agents', admin: 'Admins',
}

/** Twelve buckets ending now: weeks (Mon–Sun) or calendar months. */
function buckets(period: Period) {
  const out: { start: Date; end: Date; label: string }[] = []
  const now = new Date()
  if (period === 'months') {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      out.push({ start, end, label: start.toLocaleDateString('en-NG', { month: 'short' }) })
    }
  } else {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
    for (let i = 11; i >= 0; i--) {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7)
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
      out.push({ start, end, label: start.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) })
    }
  }
  return out
}

function series<T>(items: T[], date: (t: T) => Date | string | undefined, b: ReturnType<typeof buckets>, value: (t: T) => number = () => 1) {
  const vals = b.map(() => 0)
  for (const it of items) {
    const d = date(it)
    if (!d) continue
    const t = new Date(d).getTime()
    const i = b.findIndex((x) => t >= x.start.getTime() && t < x.end.getTime())
    if (i >= 0) vals[i] += value(it)
  }
  return b.map((x, i) => ({ label: x.label, value: vals[i] }))
}

const sum = (d: { value: number }[]) => d.reduce((t, x) => t + x.value, 0)
const count = (n: number) => n.toLocaleString('en-NG')

export default async function Analytics({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin()
  const period: Period = (await searchParams).period === 'months' ? 'months' : 'weeks'
  const b = buckets(period)
  const since = b[0].start
  const range = { $gte: since }

  const [props, users, inquiries, clicks, deals, reservations, types, earners, hot] = await Promise.all([
    Models.Property.find({ createdAt: range }).select('createdAt').lean(),
    Models.User.find({ createdAt: range }).select('createdAt userType').lean(),
    Models.Inquiry.find({ createdAt: range }).select('createdAt property').lean(),
    Models.ClickTracking.find({ createdAt: range }).select('createdAt').lean().catch(() => []),
    Models.Transaction.find({ paymentStatus: 'completed', transactionDate: range }).select('transactionDate commissionSplit promoter').lean(),
    Models.RoomVoucherReservation.find({ createdAt: range }).select('createdAt').lean().catch(() => []),
    Models.Property.find({ verificationStatus: 'verified' }).select('propertyType').lean(),
    Models.Transaction.find({ paymentStatus: 'completed', promoter: { $ne: null } }).select('promoter commissionSplit.promoter.amount').populate('promoter', 'name userType').lean(),
    Models.Inquiry.find({ createdAt: range }).select('property').populate('property', 'title').lean(),
  ])

  const listings = series(props as any[], (p) => p.createdAt, b)
  const signups = series(users as any[], (u) => u.createdAt, b)
  const leads = series(inquiries as any[], (q) => q.createdAt, b)
  const traffic = series(clicks as any[], (c) => c.createdAt, b)
  const revenue = series(deals as any[], (t) => t.transactionDate, b, (t) => t.commissionSplit?.platform?.amount || 0)
  const stays = series(reservations as any[], (r) => r.createdAt, b)

  const byType = new Map<string, number>()
  for (const u of users as any[]) byType.set(u.userType, (byType.get(u.userType) || 0) + 1)
  const propTypes = new Map<string, number>()
  for (const p of types as any[]) propTypes.set(p.propertyType, (propTypes.get(p.propertyType) || 0) + 1)
  const maxType = Math.max(1, ...propTypes.values())

  const top = new Map<string, { name: string; type: string; id: string; amount: number; deals: number }>()
  for (const t of plain<any[]>(earners)) {
    if (!t.promoter) continue
    const k = t.promoter._id
    const e = top.get(k) || { name: t.promoter.name, type: t.promoter.userType, id: k, amount: 0, deals: 0 }
    e.amount += t.commissionSplit?.promoter?.amount || 0
    e.deals++
    top.set(k, e)
  }
  const topEarners = [...top.values()].sort((a, z) => z.amount - a.amount).slice(0, 8)

  const perProp = new Map<string, { title: string; id: string; n: number }>()
  for (const q of plain<any[]>(hot)) {
    if (!q.property) continue
    const e = perProp.get(q.property._id) || { title: q.property.title, id: q.property._id, n: 0 }
    e.n++
    perProp.set(q.property._id, e)
  }
  const hotProps = [...perProp.values()].sort((a, z) => z.n - a.n).slice(0, 8)
  const span = period === 'weeks' ? 'last 12 weeks' : 'last 12 months'

  return (
    <>
      <DashHeader title="Analytics" intro={`How the platform is growing over the ${span}.`} />
      <Tabs items={[
        { label: 'Weekly', href: '/superadmin/analytics', active: period === 'weeks' },
        { label: 'Monthly', href: '/superadmin/analytics?period=months', active: period === 'months' },
      ]} />
      <StatGrid>
        <Stat label="New listings" value={count(sum(listings))} accent />
        <Stat label="Sign-ups" value={count(sum(signups))} />
        <Stat label="Enquiries" value={count(sum(leads))} />
        <Stat label="Platform revenue" value={naira(sum(revenue), { compact: true })} hint={`${(deals as any[]).length} completed deals`} />
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="New listings"><Bars data={listings} format={count} emptyText="No listings in this period." /></Panel>
        <Panel title="Enquiries"><Bars data={leads} format={count} emptyText="No enquiries in this period." /></Panel>
        <Panel title="Sign-ups"><Bars data={signups} format={count} emptyText="No sign-ups in this period." /></Panel>
        <Panel title="Promoter link clicks"><Bars data={traffic} format={count} emptyText="No tracked clicks in this period." /></Panel>
        <Panel title="Platform revenue" intro="Platform share of completed deals."><Bars data={revenue} format={(n) => naira(n, { compact: true })} emptyText="No completed deals in this period." /></Panel>
        <Panel title="Room Voucher reservations"><Bars data={stays} format={count} emptyText="No reservations in this period." /></Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Who joined" intro={`Sign-ups, ${span}`}>
          {byType.size === 0 ? <p className="text-sm text-muted">No sign-ups yet.</p> : (
            <ul className="grid gap-2 text-sm">
              {[...byType.entries()].sort((a, z) => z[1] - a[1]).map(([k, n]) => (
                <li key={k} className="flex justify-between gap-3"><span className="text-ink-2">{USER_LABEL[k] || k}</span><strong className="font-semibold">{count(n)}</strong></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Live listings by type">
          {propTypes.size === 0 ? <p className="text-sm text-muted">No verified listings yet.</p> : (
            <ul className="grid gap-3 text-sm">
              {[...propTypes.entries()].sort((a, z) => z[1] - a[1]).map(([k, n]) => (
                <li key={k}>
                  <div className="mb-1 flex justify-between"><span className="text-ink-2">{PROPERTY_TYPES[k] || k || 'Other'}</span><strong className="font-semibold">{count(n)}</strong></div>
                  <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-lagoon" style={{ width: `${(n / maxType) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Most enquired" intro={span}>
          {hotProps.length === 0 ? <p className="text-sm text-muted">No enquiries yet.</p> : (
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
              {hotProps.map((p) => (
                <li key={p.id} className="flex min-w-0 justify-between gap-3"><Link href={`/superadmin/properties/${p.id}`} className="min-w-0 truncate text-ink hover:text-teal-ink">{p.title}</Link><strong className="shrink-0 font-semibold">{p.n}</strong></li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel className="mt-6" pad={false} title="Top earners" intro="Promoters and partners by commission from completed deals, all time.">
        {topEarners.length === 0 ? <EmptyState title="No completed deals yet" body="Record a sale or letting under Transactions to credit a promoter." /> : (
          <Table head={['Name', 'Deals', 'Earned']}>
            {topEarners.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/superadmin/${e.type === 'business_partner' ? 'business-partners' : 'promoters'}/${e.id}`} className="font-semibold text-ink hover:text-teal-ink">{e.name}</Link></td>
                <td>{e.deals}</td>
                <td className="font-semibold">{naira(e.amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  )
}
