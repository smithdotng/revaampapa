import type { Metadata } from 'next'
import Link from 'next/link'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, PAGE, qs } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs, Stat, StatGrid } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Pager, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { DealForm } from '@/components/admin/DealForm'
import { setTransactionStatus } from '@/actions/admin'

export const metadata: Metadata = { title: 'Transactions' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; promoter?: string; from?: string; to?: string; page?: string }

const pct = (k: string, d: number) => {
  const n = Number(process.env[k])
  return Number.isFinite(n) && n >= 0 ? n : d
}

export default async function Transactions({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const query: any = {}
  if (sp.status) query.paymentStatus = sp.status
  if (sp.promoter) query.promoter = sp.promoter
  if (sp.from || sp.to) {
    query.transactionDate = {}
    if (sp.from) query.transactionDate.$gte = new Date(sp.from)
    if (sp.to) query.transactionDate.$lte = new Date(sp.to + 'T23:59:59')
  }
  const [items, total, completed, pendingCount, properties, earners] = await Promise.all([
    Models.Transaction.find(query).populate('property', 'title location').populate('promoter', 'name userType').sort('-transactionDate').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.Transaction.countDocuments(query),
    Models.Transaction.find({ paymentStatus: 'completed' }).select('amount agencyFee commissionSplit').lean(),
    Models.Transaction.countDocuments({ paymentStatus: 'pending' }),
    Models.Property.find({ verificationStatus: 'verified' }).select('title location price transactionType').sort('title').limit(1000).lean(),
    Models.User.find({ userType: { $in: ['promoter', 'business_partner'] }, isSuspended: { $ne: true } }).select('name email userType').sort('name').lean(),
  ])
  const done = completed as any[]
  const volume = done.reduce((s, t) => s + (t.amount || 0), 0)
  const platform = done.reduce((s, t) => s + (t.commissionSplit?.platform?.amount || 0), 0)
  const paidOut = done.reduce((s, t) => s + (t.commissionSplit?.promoter?.amount || 0), 0)
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/transactions${qs({ ...sp, status, page: undefined })}`
  const promoterOptions = (earners as any[]).map((u) => [String(u._id), `${u.name} (${u.userType === 'business_partner' ? 'partner' : 'promoter'})`] as [string, string])

  return (
    <>
      <DashHeader title="Transactions" intro="Completed sales and lettings, and the commission each one paid." />
      <StatGrid>
        <Stat label="Deal volume" value={naira(volume, { compact: true })} hint={`${done.length} completed deals`} accent />
        <Stat label="Platform revenue" value={naira(platform, { compact: true })} />
        <Stat label="Paid to promoters" value={naira(paidOut, { compact: true })} />
        <Stat label="Pending" value={pendingCount} hint="Fee not received yet" />
      </StatGrid>
      <div className="my-6">
        <DealForm
          properties={(properties as any[]).map((p) => ({ id: String(p._id), label: `${p.title} — ${place(p.location)}`, price: p.price }))}
          promoters={promoterOptions.map(([id, label]) => ({ id, label }))}
          split={{ promoter: pct('PROMOTER_COMMISSION', 70), owner: pct('OWNER_COMMISSION', 10) }}
        />
      </div>
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status },
        { label: 'Completed', href: tab('completed'), active: sp.status === 'completed', count: done.length },
        { label: 'Pending', href: tab('pending'), active: sp.status === 'pending', count: pendingCount },
        { label: 'Failed', href: tab('failed'), active: sp.status === 'failed' },
      ]} />
      <Filters selects={[{ name: 'promoter', label: 'Promoter', options: [['', 'Everyone'], ...promoterOptions] }]} dates />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No transactions yet" body="Record a deal above when a property is sold or let." /> : (
          <Table head={['Property', 'Promoter', 'Date', 'Amount', 'Agency fee', 'Promoter share', 'Status', '']}>
            {list.map((t) => (
              <tr key={t._id}>
                <td className="max-w-[260px]"><Link href={`/superadmin/transactions/${t._id}`} className="font-semibold text-ink hover:text-teal-ink">{t.property?.title || 'Deleted property'}</Link><p className="text-sm text-muted">{t.buyer?.name || '—'} · {t.transactionType}</p></td>
                <td className="text-ink-2">{t.promoter?.name || <span className="text-muted">Direct</span>}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(t.transactionDate)}</td>
                <td className="whitespace-nowrap">{naira(t.amount, { compact: true })}</td>
                <td className="whitespace-nowrap">{naira(t.agencyFee)}</td>
                <td className="whitespace-nowrap">{naira(t.commissionSplit?.promoter?.amount || 0)}</td>
                <td><StatusPill status={t.paymentStatus} /></td>
                <td>
                  {t.paymentStatus === 'pending' && (
                    <Actions>
                      <Act action={setTransactionStatus} id={t._id} extra={{ status: 'completed' }} variant="ok" label="Fee received" confirm="Complete this deal and credit the promoter?" submitLabel="Complete" />
                      <Act action={setTransactionStatus} id={t._id} extra={{ status: 'failed' }} variant="danger" label="Fell through" confirm="Mark this deal as failed?" submitLabel="Mark failed" />
                    </Actions>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/transactions" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
