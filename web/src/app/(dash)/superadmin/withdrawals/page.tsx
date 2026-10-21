import type { Metadata } from 'next'
import Link from 'next/link'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, PAGE, qs } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs, Stat, StatGrid } from '@/components/dash/ui'
import { Pager, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { processWithdrawal, rejectWithdrawal } from '@/actions/admin'

export const metadata: Metadata = { title: 'Withdrawals' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; page?: string }

export default async function Withdrawals({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const status = sp.status ?? 'pending'
  const page = pageOf(sp.page)
  const query: any = status === 'all' ? {} : { status }
  const [items, total, all] = await Promise.all([
    Models.Withdrawal.find(query).populate('promoter', 'name email phone userType').sort(status === 'pending' ? 'createdAt' : '-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.Withdrawal.countDocuments(query),
    Models.Withdrawal.find().select('status amount').lean(),
  ])
  const rows = all as any[]
  const n = (s: string) => rows.filter((r) => r.status === s).length
  const amt = (s: string) => rows.filter((r) => r.status === s).reduce((t, r) => t + (r.amount || 0), 0)
  const list = plain<any[]>(items)
  const tab = (s: string) => `/superadmin/withdrawals${qs({ status: s })}`

  return (
    <>
      <DashHeader title="Withdrawals" intro="Promoters and partners withdraw their earnings to their bank. Pay the transfer, then mark it paid with the reference — they’re emailed either way." />
      <StatGrid>
        <Stat label="To pay" value={naira(amt('pending') + amt('approved'))} hint={`${n('pending') + n('approved')} requests`} accent />
        <Stat label="Paid out" value={naira(amt('processed'))} hint={`${n('processed')} transfers`} />
        <Stat label="Declined" value={n('rejected')} />
        <Stat label="All requests" value={rows.length} />
      </StatGrid>
      <div className="mt-6" />
      <Tabs items={[
        { label: 'To pay', href: tab('pending'), active: status === 'pending', count: n('pending') },
        { label: 'Paid', href: tab('processed'), active: status === 'processed', count: n('processed') },
        { label: 'Declined', href: tab('rejected'), active: status === 'rejected', count: n('rejected') },
        { label: 'All', href: tab('all'), active: status === 'all', count: rows.length },
      ]} />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title={status === 'pending' ? 'No withdrawals to pay' : 'Nothing here'} /> : (
          <Table head={['Requested by', 'Amount', 'Pay to', 'Requested', 'Status', '']}>
            {list.map((w) => {
              const u = w.promoter
              const href = u ? `/superadmin/${u.userType === 'business_partner' ? 'business-partners' : 'promoters'}/${u._id}` : ''
              return (
                <tr key={w._id}>
                  <td>{u ? <Link href={href} className="font-semibold text-ink hover:text-teal-ink">{u.name}</Link> : 'Deleted account'}<p className="text-sm text-muted">{u?.phone}</p></td>
                  <td className="whitespace-nowrap font-display text-lg font-semibold">{naira(w.amount)}</td>
                  <td className="text-sm"><span className="font-medium text-ink">{w.bankDetails?.accountName}</span><br /><span className="text-muted">{w.bankDetails?.bankName} · <span className="font-mono">{w.bankDetails?.accountNumber}</span></span></td>
                  <td className="whitespace-nowrap text-muted">{formatDate(w.createdAt)}</td>
                  <td><StatusPill status={w.status} label={w.status === 'processed' ? 'Paid' : undefined} />{w.transactionReference && <p className="mt-1 text-xs text-muted">Ref {w.transactionReference}</p>}{w.status === 'rejected' && w.adminNotes && <p className="mt-1 max-w-[200px] text-xs text-muted">{w.adminNotes}</p>}</td>
                  <td>
                    {(w.status === 'pending' || w.status === 'approved') && (
                      <Actions>
                        <Act action={processWithdrawal} id={w._id} variant="ok" label="Mark paid" ask={[{ name: 'reference', label: 'Transfer reference', required: true }, { name: 'note', label: 'Internal note' }]} submitLabel="Mark paid" />
                        <Act action={rejectWithdrawal} id={w._id} variant="danger" label="Decline" ask={[{ name: 'reason', label: 'Reason (emailed)', type: 'textarea', required: true }]} submitLabel="Decline and refund balance" />
                      </Actions>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/withdrawals" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
