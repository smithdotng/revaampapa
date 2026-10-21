import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { formatDate } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, EmptyState, StatusPill } from '@/components/dash/ui'
import { VERDICT } from '@/lib/labels'

export const metadata: Metadata = { title: 'Overview' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function ArchitectDashboard() {
  const v = await requireRole('architect')
  const a = v.doc.architectProfile || {}
  const reports = plain<any[]>(await Models.StructuralAssessment.find({ architect: v.doc._id }).sort('-createdAt').limit(50).lean())
  return (
    <>
      <DashHeader title={`Welcome, ${v.name.split(' ')[0]}`} intro="REVAAMP Partner Architect. Submit structural assessments of proposed projects and track their review."
        actions={a.isActive && <Link href="/architect/assessment/new" className="btn btn-primary"><Plus className="size-4" aria-hidden /> New assessment</Link>} />
      {!a.isActive && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-roof/40 bg-roof-soft p-5 text-[#7a3a0a]">
          <p className="font-semibold">Your application is under review</p>
          <p className="mt-1 text-sm">We verify your ARCON registration before you can submit assessments. We’ll email you when you’re approved.</p>
        </div>
      )}
      <StatGrid cols={3}>
        <Stat label="Reports submitted" value={a.kpiMetrics?.assessmentsSubmitted || reports.length} accent />
        <Stat label="Projects verified" value={a.kpiMetrics?.projectsVerified || 0} />
        <Stat label="Under review" value={reports.filter((r) => r.status !== 'verified').length} />
      </StatGrid>
      <Panel className="mt-6" title="Your structural assessments" pad={false}>
        {reports.length ? (
          <ul className="divide-y divide-line">
            {reports.map((r) => (
              <li key={r._id} className="relative flex items-center gap-4 px-5 py-4 hover:bg-paper/60 sm:px-6">
                <div className="min-w-0 flex-1">
                  <Link href={`/architect/assessment/${r._id}`} className="font-semibold after:absolute after:inset-0">{r.projectTitle}</Link>
                  <p className="text-sm text-muted">{r.projectLocation || '—'} / {VERDICT[r.recommendation]} / {formatDate(r.submittedAt)}</p>
                </div>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No reports yet" body={a.isActive ? 'When the Revaamp team sends you a project to assess, record your findings here.' : 'You can submit reports once approved.'} />}
      </Panel>
    </>
  )
}
