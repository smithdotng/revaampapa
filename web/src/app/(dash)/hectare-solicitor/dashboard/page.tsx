import type { Metadata } from 'next'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, EmptyState, StatusPill } from '@/components/dash/ui'

export const metadata: Metadata = { title: 'Overview' }

/* eslint-disable @typescript-eslint/no-explicit-any */
const SKILLS = ['Legal mechanisms for agricultural financing', 'Solutions for agribusiness', 'Real estate transaction structuring', 'Cooperative governance and compliance', 'Project-based legal service delivery', 'Cross-border real estate transactions', 'Dispute resolution in agriculture', 'Due diligence for agribusiness']

export default async function HbhDashboard() {
  const v = await requireRole('hectare_solicitor')
  const h = v.doc.hectareProfile || {}
  const coops = plain<any[]>(await Models.Cooperative.find({ solicitor: v.doc._id }).sort('-createdAt').lean())
  return (
    <>
      <DashHeader title={`Welcome, ${v.name.split(' ')[0]}`} intro="Revaamp HbH Solicitor. You provide legal services to cooperative societies in agriculture and real estate." />
      {!h.isActive && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-roof/40 bg-roof-soft p-5 text-[#7a3a0a]">
          <p className="font-semibold">Your application is under review</p>
          <p className="mt-1 text-sm">Once approved, a cooperative society is assigned to you and appears below.</p>
        </div>
      )}
      <StatGrid cols={3}>
        <Stat label="Professional fees" value={naira(h.earnings?.totalFees || 0)} accent />
        <Stat label="Awaiting payment" value={naira(h.earnings?.pendingPayments || 0)} />
        <Stat label="Cooperatives" value={coops.length} />
      </StatGrid>
      <Panel className="mt-6" title="Your cooperative societies" pad={false}>
        {coops.length ? (
          <ul className="divide-y divide-line">
            {coops.map((c) => (
              <li key={c._id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1"><p className="font-semibold">{c.name}</p><p className="text-sm text-muted">{[c.state, c.country].filter(Boolean).join(', ')} / {(c.members || []).length} members{c.registrationNumber ? ` / Reg. ${c.registrationNumber}` : ''}</p></div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No cooperative assigned yet" body={h.isActive ? 'The Revaamp team will assign one to you shortly.' : 'A cooperative is assigned once your application is approved.'} />}
      </Panel>
      <Panel className="mt-6" title="What you’ll work on">
        <ul className="grid gap-2 sm:grid-cols-2">{SKILLS.map((s) => <li key={s} className="flex gap-3 text-sm text-ink-2"><span aria-hidden className="mt-[0.6em] h-[2px] w-3 shrink-0 bg-roof" />{s}</li>)}</ul>
        <p className="mt-5 text-sm text-ink-2">Questions? Contact the implementation team at <a className="link" href="mailto:info@revaampapa.com">info@revaampapa.com</a>.</p>
      </Panel>
    </>
  )
}
