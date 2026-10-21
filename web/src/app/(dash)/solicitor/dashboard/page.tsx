import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole, plain, baseUrl } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, EmptyState, Table, StatusPill } from '@/components/dash/ui'
import { CopyLink } from '@/components/dash/client'

export const metadata: Metadata = { title: 'Overview' }

/* eslint-disable @typescript-eslint/no-explicit-any */
const SOLUTIONS = ['Joint Ownership Solution', 'Project Management Solution', 'Equity Release Scheme', 'Mortgage Scheme', 'Land Swap Scheme', 'Students Housing Scheme', 'Staff Housing Scheme', 'Food Court Scheme']

function Target({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-muted">{value} of {target} this quarter</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={value} aria-valuemax={target} aria-label={label}><div className="h-full rounded-full bg-lagoon" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default async function SolicitorDashboard() {
  const v = await requireRole('solicitor')
  const p = v.doc.partnerProfile || {}
  const k = p.kpiMetrics || {}
  const tx = plain<any[]>(await Models.Transaction.find({ solicitor: v.doc._id }).populate('property', 'title').sort('-transactionDate').limit(10).lean())
  return (
    <>
      <DashHeader title={`Welcome, ${v.name.split(' ')[0]}`} intro="REVAAMP Partner Solicitor. You earn 70% of legal fees on transactions you initiate — even when other lawyers execute them." />
      {!p.isActive && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-roof/40 bg-roof-soft p-5 text-[#7a3a0a]">
          <p className="font-semibold">Your application is under review</p>
          <p className="mt-1 text-sm">We check your bar enrolment and documents before activating your account. We’ll email you when you’re approved.</p>
        </div>
      )}
      <StatGrid>
        <Stat label="Legal fees earned" value={naira(p.earnings?.totalLegalFees || 0)} accent />
        <Stat label="Awaiting payment" value={naira(p.earnings?.pendingPayments || 0)} />
        <Stat label="Transactions initiated" value={k.transactionsInitiated || 0} />
        <Stat label="Years in practice" value={p.yearsOfPractice || '—'} />
      </StatGrid>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Quarterly targets" action={<Link href="/solicitor/kpis" className="text-sm font-medium text-teal-ink hover:text-ink">Update</Link>}>
          <div className="grid gap-5">
            <Target label="Transactions initiated" value={k.transactionsInitiated || 0} target={4} />
            <Target label="Promoters onboarded" value={k.promotersOnboarded || 0} target={15} />
            <p className="text-sm text-muted">Cooperative societies established: <strong className="text-ink">{k.cooperativeSocietiesEstablished || 0}</strong></p>
          </div>
        </Panel>
        <Panel title="Onboard promoters" intro="Invite agents and marketers to join Revaamp.">
          <CopyLink url={`${baseUrl()}/promoter/register`} message="Join RevaampAPA as a property promoter — free, and earn up to 90% of the agency fee:" />
        </Panel>
      </div>
      <Panel className="mt-6" title="Recent transactions" pad={false}>
        {tx.length ? (
          <Table head={['Property / project', 'Date', 'Value', 'Status']}>
            {tx.map((t) => <tr key={t._id}><td className="font-medium">{t.property?.title || '—'}</td><td>{formatDate(t.transactionDate)}</td><td>{naira(t.amount)}</td><td><StatusPill status={t.paymentStatus} /></td></tr>)}
          </Table>
        ) : <EmptyState title="No transactions yet" body="Transactions you initiate with the Revaamp team appear here with your legal fees." />}
      </Panel>
      <Panel className="mt-6" title="Revaamp solutions you can support">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{SOLUTIONS.map((s) => <li key={s} className="rounded-[var(--radius-sm)] bg-paper px-3 py-2 text-sm">{s}</li>)}</ul>
        <p className="mt-4 text-sm text-ink-2">To initiate a transaction under any scheme, email <a className="link" href="mailto:info@revaampapa.com">info@revaampapa.com</a> with the client and property details.</p>
      </Panel>
    </>
  )
}
