import type { Metadata } from 'next'
import { Models } from '@/lib/legacy'
import { requireAdmin, rx, qs } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Actions, QueueItem, Facts, DocLink } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { updateProject, postProjectUpdate } from '@/actions/admin'

export const metadata: Metadata = { title: 'Projects' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string }

const STATUSES: [string, string][] = [
  ['pending_approval', 'Awaiting approval'], ['approved', 'Approved'], ['in_progress', 'In progress'], ['on_hold', 'On hold'],
  ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['draft', 'Draft'],
]

export default async function Projects({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const query: any = {}
  if (sp.status) query.status = sp.status
  if (sp.q) query.$or = [{ title: rx(sp.q) }, { 'location.city': rx(sp.q) }]
  const [items, groups] = await Promise.all([
    Models.Project.find(query).populate('subscriber', 'name email').sort('-createdAt').limit(100).lean(),
    Models.Project.find().select('status').lean(),
  ])
  const count = (s: string) => (groups as any[]).filter((g) => g.status === s).length
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/projects${qs({ status, q: sp.q })}`

  return (
    <>
      <DashHeader back={{ label: '← Project subscribers', href: '/superadmin/project-subscribers' }} title="Projects"
        intro="Approve new builds, track progress and post updates subscribers see on their dashboard." />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: (groups as any[]).length },
        ...STATUSES.slice(0, 5).map(([s, l]) => ({ label: l, href: tab(s), active: sp.status === s, count: count(s) })),
      ]} />
      <Filters search="Search title or city" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No projects here" /> : (
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <QueueItem key={p._id} title={p.title} aside={<StatusPill status={p.status} />}
                meta={`${p.subscriber?.name || 'Unknown subscriber'} · ${place(p.location)} · created ${formatDate(p.createdAt)}`}
                actions={
                  <Actions>
                    {p.status === 'pending_approval' && <Act action={updateProject} id={p._id} extra={{ status: 'approved' }} variant="ok" label="Approve" />}
                    {p.status === 'pending_approval' && <Act action={updateProject} id={p._id} extra={{ status: 'cancelled' }} variant="danger" label="Decline" confirm="Decline this project? The subscriber is emailed." submitLabel="Decline" />}
                    <Act action={updateProject} id={p._id} label="Update status"
                      ask={[
                        { name: 'status', label: 'Status', type: 'select', options: STATUSES, defaultValue: p.status },
                        { name: 'progress', label: 'Progress (%)', type: 'number', defaultValue: String(p.progress ?? 0) },
                        ...(p.bankGuarantee?.referenceNumber ? [{ name: 'guarantee', label: 'Bank guarantee', type: 'select' as const, options: [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']] as [string, string][], defaultValue: p.bankGuarantee.status || 'pending' }] : []),
                      ]} submitLabel="Save" />
                    <Act action={postProjectUpdate} id={p._id} label="Post update" ask={[{ name: 'title', label: 'Headline', required: true }, { name: 'content', label: 'Update', type: 'textarea', required: true }]} submitLabel="Post and email" />
                  </Actions>
                }>
                <Facts items={[
                  ['Type', p.projectType],
                  ['Value', naira(p.projectValue)],
                  ['Duration', p.projectDuration ? `${p.projectDuration} months` : undefined],
                  ['Funding', p.fundingSource?.replace(/_/g, ' ')],
                  ['Progress', `${p.progress || 0}%`],
                  ['Updates posted', (p.updates || []).length],
                  ['Guarantee', p.bankGuarantee?.referenceNumber ? `${p.bankGuarantee.bankName || ''} ${p.bankGuarantee.referenceNumber} (${p.bankGuarantee.status || 'pending'})` : undefined],
                ]} />
                {p.bankGuarantee?.documentUrl && <div className="mt-2"><DocLink url={p.bankGuarantee.documentUrl} label="Guarantee document" /></div>}
              </QueueItem>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
