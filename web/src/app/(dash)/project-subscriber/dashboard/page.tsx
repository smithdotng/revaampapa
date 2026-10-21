import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, StatusPill, EmptyState } from '@/components/dash/ui'

export const metadata: Metadata = { title: 'Overview' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function SubscriberDashboard() {
  const v = await requireRole('project_subscriber')
  const prof = v.doc.projectSubscriberProfile || {}
  const projects = plain<any[]>(await Models.Project.find({ subscriber: v.id }).select('title slug status progress projectValue location createdAt').sort('-createdAt').lean())
  const subscribed = prof.subscriptionStatus === 'active'
  const bg = prof.bankGuarantee?.status as string | undefined
  const bgApproved = bg === 'approved'
  const steps = [
    { done: subscribed, label: 'Activate your subscription', body: subscribed ? `${(prof.subscriptionPlan || 'basic').replace(/^\w/, (c: string) => c.toUpperCase())} plan, renews ${formatDate(prof.subscriptionExpiry)}` : 'Choose a plan and pay online.', href: '/project-subscriber/subscription', cta: 'Choose a plan' },
    { done: bgApproved, label: 'Get your bank guarantee approved', body: bg === 'pending' && prof.bankGuarantee?.referenceNumber ? 'Submitted — we’re verifying it.' : bg === 'rejected' ? 'It wasn’t accepted. Submit a new one.' : bgApproved ? `${prof.bankGuarantee.bankName}, ${naira(prof.bankGuarantee.amount)}` : 'Upload the guarantee from your bank.', href: '/project-subscriber/bank-guarantee', cta: 'Submit guarantee' },
    { done: projects.length > 0, label: 'Start your first project', body: projects.length ? `${projects.length} project${projects.length > 1 ? 's' : ''} so far` : 'Tell us what you’re building.', href: '/project-subscriber/projects/create', cta: 'Start a project' },
  ]
  const next = steps.find((s) => !s.done)
  return (
    <>
      <DashHeader title={`Welcome, ${v.name.split(' ')[0]}`} intro="Track your builds, milestones and spending in one place." />
      {next && (
        <Panel className="mb-6" title="Getting started">
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.label} className={`rounded-[var(--radius-md)] border p-4 ${s === next ? 'border-lagoon' : 'border-line'}`}>
                <span className={`grid size-8 place-items-center rounded-full text-sm font-semibold ${s.done ? 'bg-lagoon text-white' : 'border border-line-2 text-muted'}`}>{s.done ? <Check className="size-4" aria-hidden /> : i + 1}</span>
                <p className="mt-3 font-semibold">{s.label}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
                {s === next && <Link href={s.href} className="btn btn-primary mt-4 min-h-10">{s.cta}</Link>}
              </li>
            ))}
          </ol>
        </Panel>
      )}
      <StatGrid>
        <Stat label="Projects" value={projects.length} accent />
        <Stat label="In progress" value={projects.filter((p) => p.status === 'in_progress').length} />
        <Stat label="Completed" value={projects.filter((p) => p.status === 'completed').length} />
        <Stat label="Total value" value={naira(projects.reduce((s, p) => s + (p.projectValue || 0), 0), { compact: true })} />
      </StatGrid>
      <Panel className="mt-6" title="Recent projects" action={projects.length > 0 && <Link href="/project-subscriber/projects" className="text-sm font-medium text-teal-ink hover:text-ink">All projects</Link>} pad={false}>
        {projects.length ? (
          <ul className="divide-y divide-line">
            {projects.slice(0, 5).map((p) => (
              <li key={p._id} className="relative flex items-center gap-4 px-5 py-4 hover:bg-paper/60 sm:px-6">
                <div className="min-w-0 flex-1">
                  <Link href={`/project-subscriber/projects/${p.slug}`} className="font-semibold after:absolute after:inset-0">{p.title}</Link>
                  <p className="text-sm text-muted">{[p.location?.city, p.location?.state].filter(Boolean).join(', ')} / {naira(p.projectValue)}</p>
                </div>
                <div className="hidden w-40 sm:block">
                  <div className="h-2 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-lagoon" style={{ width: `${p.progress || 0}%` }} /></div>
                  <p className="mt-1 text-xs text-muted">{p.progress || 0}% complete</p>
                </div>
                <StatusPill status={p.status} />
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No projects yet" body="Once your bank guarantee is approved, you can submit your first project." />}
      </Panel>
    </>
  )
}
