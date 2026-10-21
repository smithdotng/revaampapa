import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, StatusPill, EmptyState, Tabs } from '@/components/dash/ui'

export const metadata: Metadata = { title: 'Projects' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Projects({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requireRole('project_subscriber')
  const { status } = await searchParams
  const all = plain<any[]>(await Models.Project.find({ subscriber: v.id }).sort('-createdAt').lean())
  const list = status ? all.filter((p) => p.status === status) : all
  const canCreate = v.doc.projectSubscriberProfile?.bankGuarantee?.status === 'approved'
  const tab = (s: string, label: string) => ({ label, href: s ? `?status=${s}` : '?', active: (status || '') === s, count: s ? all.filter((p) => p.status === s).length : all.length })
  return (
    <>
      <DashHeader title="Projects" actions={canCreate ? <Link href="/project-subscriber/projects/create" className="btn btn-primary"><Plus className="size-4" aria-hidden /> New project</Link> : <Link href="/project-subscriber/bank-guarantee" className="btn btn-ghost">Bank guarantee needed to start</Link>} />
      <Tabs items={[tab('', 'All'), tab('pending_approval', 'Awaiting approval'), tab('in_progress', 'In progress'), tab('completed', 'Completed')]} />
      <Panel pad={false}>
        {list.length ? (
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p._id} className="relative grid gap-3 px-5 py-5 hover:bg-paper/60 sm:px-6 md:grid-cols-[1fr_180px_auto] md:items-center">
                <div className="min-w-0">
                  <Link href={`/project-subscriber/projects/${p.slug}`} className="font-semibold after:absolute after:inset-0">{p.title}</Link>
                  <p className="text-sm text-muted">{p.projectType} / {[p.location?.city, p.location?.state].filter(Boolean).join(', ')} / {naira(p.projectValue)} / submitted {formatDate(p.createdAt)}</p>
                </div>
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-lagoon" style={{ width: `${p.progress || 0}%` }} /></div>
                  <p className="mt-1 text-xs text-muted">{p.progress || 0}% / {(p.milestones || []).filter((m: any) => m.status === 'completed').length} of {(p.milestones || []).length} milestones</p>
                </div>
                <StatusPill status={p.status} />
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No projects here" body={canCreate ? 'Start a project and our team will assign a project manager.' : 'Once your bank guarantee is approved, you can submit a project.'} />}
      </Panel>
    </>
  )
}
