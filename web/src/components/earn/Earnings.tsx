import Link from 'next/link'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, wallet, type EarnRole } from '@/lib/earn'
import { lastSixMonths } from '@/lib/dash-data'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, Table, Stat, StatGrid, StatusPill, Bars } from '@/components/dash/ui'
import { WithdrawForm } from './WithdrawForm'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function EarnEarnings({ role }: { role: EarnRole }) {
  const v = await requireRole(role)
  const [tx, wd] = await Promise.all([
    Models.Transaction.find({ promoter: v.id, paymentStatus: 'completed' }).populate('property', 'title').sort('-transactionDate').lean(),
    Models.Withdrawal.find({ promoter: v.id }).sort('-createdAt').limit(50).lean(),
  ])
  const t = plain<any[]>(tx)
  const w = plain<any[]>(wd)
  const wal = wallet(v.doc)
  const com = (x: any) => x.commissionSplit?.promoter?.amount || 0
  const paidOut = w.filter((x) => x.status === 'processed').reduce((s, x) => s + x.amount, 0)
  const inProgress = w.filter((x) => ['pending', 'approved'].includes(x.status)).reduce((s, x) => s + x.amount, 0)
  const bank = wal.bank?.accountNumber ? `${wal.bank.bankName} ••••${String(wal.bank.accountNumber).slice(-4)}` : ''

  return (
    <>
      <DashHeader title="Earnings" intro="Commission from completed deals, and withdrawals to your bank." />
      <StatGrid>
        <Stat label="Available to withdraw" value={naira(wal.available)} accent />
        <Stat label="Total earned" value={naira(wal.totalEarnings || t.reduce((s, x) => s + com(x), 0))} />
        <Stat label="Being paid out" value={naira(inProgress)} />
        <Stat label="Paid to you" value={naira(paidOut)} />
      </StatGrid>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Commission by month"><Bars data={lastSixMonths(t, 'transactionDate', com)} format={(n) => naira(n, { compact: true })} /></Panel>
        <Panel title="Withdraw" intro="Requests are paid to your bank after review.">
          {bank ? <WithdrawForm available={wal.available} bank={bank} /> : (
            <EmptyState title="Add a payout account first" body="We need your bank details before we can pay you." action={<Link href={`${earnBase(role)}/settings`} className="btn btn-primary">Add bank details</Link>} />
          )}
        </Panel>
      </div>
      <Panel className="mt-6" title="Withdrawals" pad={false}>
        {w.length ? (
          <Table head={['Requested', 'Amount', 'To', 'Status', 'Reference']}>
            {w.map((x) => <tr key={x._id}><td>{formatDate(x.createdAt)}</td><td className="font-semibold">{naira(x.amount)}</td><td className="text-muted">{x.bankDetails?.bankName} ••••{String(x.bankDetails?.accountNumber || '').slice(-4)}</td><td><StatusPill status={x.status === 'processed' ? 'paid' : x.status} /></td><td className="text-muted">{x.transactionReference || x.adminNotes || '—'}</td></tr>)}
          </Table>
        ) : <EmptyState title="No withdrawals yet" />}
      </Panel>
      <Panel className="mt-6" title="Commission history" pad={false}>
        {t.length ? (
          <Table head={['Property', 'Date', 'Deal value', 'Your commission']}>
            {t.map((x) => <tr key={x._id}><td className="font-medium">{x.property?.title || '—'}</td><td>{formatDate(x.transactionDate)}</td><td>{naira(x.amount)}</td><td className="font-semibold">{naira(com(x))}</td></tr>)}
          </Table>
        ) : <EmptyState title="No commission yet" body="When a deal you introduced completes, your share is credited here." />}
      </Panel>
    </>
  )
}
