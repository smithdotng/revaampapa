import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { formatDate } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue } from '@/components/dash/ui'
import { VERDICT } from '@/lib/labels'

export const metadata: Metadata = { title: 'Structural assessment' }

/* eslint-disable @typescript-eslint/no-explicit-any */
const SECTIONS: [string, string][] = [['siteConditions', 'Site conditions'], ['foundationAssessment', 'Foundation'], ['structuralDesignReview', 'Structural design review'], ['materialsAssessment', 'Materials'], ['loadBearingEvaluation', 'Load-bearing evaluation'], ['complianceWithCodes', 'Compliance with building codes'], ['identifiedRisks', 'Risks identified'], ['recommendations', 'Recommendations'], ['conditions', 'Conditions'], ['remarks', 'Remarks']]

export default async function Assessment({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireRole('architect')
  const { id } = await params
  const a: any = plain(await Models.StructuralAssessment.findOne({ _id: id, architect: v.doc._id }).lean().catch(() => null))
  if (!a) notFound()
  return (
    <>
      <DashHeader back={{ label: 'All reports', href: '/architect/dashboard' }} title={a.projectTitle} intro={<span className="flex flex-wrap items-center gap-3"><StatusPill status={a.status} /> Submitted {formatDate(a.submittedAt)}</span>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="grid content-start gap-6">
          <Panel title="Verdict">
            <KeyValue items={[['Recommendation', VERDICT[a.recommendation]], ['Structural integrity', a.structuralIntegrityRating?.replace(/^\w/, (c: string) => c.toUpperCase())], ['Location', a.projectLocation], ['Promoter / client', a.promoterName], ['Proposed use', a.proposedUse]]} />
          </Panel>
          {(a.supportingDocuments || []).length > 0 && (
            <Panel title="Documents"><ul className="grid gap-2">{a.supportingDocuments.map((d: any) => <li key={d.url}><a href={d.url} className="link text-sm" target="_blank">{d.name}</a></li>)}</ul></Panel>
          )}
        </div>
        <Panel title="Findings">
          <div className="grid gap-6">
            {SECTIONS.filter(([k]) => a[k]).map(([k, label]) => (
              <section key={k}><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 whitespace-pre-wrap text-ink-2">{a[k]}</p></section>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
