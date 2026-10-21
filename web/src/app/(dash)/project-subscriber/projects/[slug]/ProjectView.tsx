import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, StatusPill, Tabs, KeyValue, Stat, StatGrid, EmptyState, Table } from '@/components/dash/ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function ProjectView({ slug, tab }: { slug: string; tab: 'overview' | 'updates' | 'financials' }) {
  const v = await requireRole('project_subscriber')
  const p: any = plain(await Models.Project.findOne({ slug, subscriber: v.id }).populate('projectManager', 'name email phone').lean())
  if (!p) notFound()
  const base = `/project-subscriber/projects/${slug}`
  const spent = p.budget?.spent || (p.budget?.expenses || []).reduce((s: number, x: any) => s + (x.amount || 0), 0)
  return (
    <>
      <DashHeader back={{ label: 'All projects', href: '/project-subscriber/projects' }} title={p.title}
        intro={<span className="flex flex-wrap items-center gap-3"><StatusPill status={p.status} /> {[p.location?.city, p.location?.state].filter(Boolean).join(', ')}</span>} />
      <Tabs items={[
        { label: 'Overview', href: base, active: tab === 'overview' },
        { label: 'Updates', href: `${base}/updates`, active: tab === 'updates', count: (p.updates || []).length },
        { label: 'Financials', href: `${base}/financials`, active: tab === 'financials' },
      ]} />

      {tab === 'overview' && (
        <div className="grid gap-6">
          <StatGrid>
            <Stat label="Progress" value={`${p.progress || 0}%`} accent />
            <Stat label="Project value" value={naira(p.projectValue, { compact: true })} />
            <Stat label="Duration" value={`${p.projectDuration} months`} hint={p.expectedCompletionDate ? `Due ${formatDate(p.expectedCompletionDate)}` : undefined} />
            <Stat label="Service fee (10%)" value={naira(p.serviceFee?.amount)} hint={p.serviceFee?.paid ? 'Paid' : 'Not yet paid'} />
          </StatGrid>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Panel title="Milestones" pad={false}>
              {(p.milestones || []).length ? (
                <ol className="divide-y divide-line">
                  {p.milestones.map((m: any, i: number) => (
                    <li key={i} className="flex gap-4 px-5 py-4 sm:px-6">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${m.status === 'completed' ? 'bg-lagoon text-white' : 'border border-line-2 text-muted'}`}>{m.status === 'completed' ? <Check className="size-4" aria-hidden /> : i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{m.title}</p><StatusPill status={m.status} /></div>
                        {m.description && <p className="mt-1 text-sm text-ink-2">{m.description}</p>}
                        <p className="mt-1 text-xs text-muted">{m.completedDate ? `Completed ${formatDate(m.completedDate)}` : m.dueDate ? `Due ${formatDate(m.dueDate)}` : ''}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <EmptyState title="Milestones are agreed after approval" body="Your project manager sets them out with you. You pay for each only after it’s delivered." />}
            </Panel>
            <div className="grid content-start gap-6">
              <Panel title="Project manager">
                {p.projectManager ? (
                  <KeyValue items={[['Name', p.projectManager.name], ['Email', <a key="e" className="link" href={`mailto:${p.projectManager.email}`}>{p.projectManager.email}</a>], ['Phone', p.projectManager.phone]]} />
                ) : <p className="text-sm text-muted">We’ll assign one once the project is approved.</p>}
              </Panel>
              <Panel title="Details">
                <KeyValue items={[['Type', p.projectType?.replace(/^\w/, (c: string) => c.toUpperCase())], ['Address', p.location?.address], ['Submitted', formatDate(p.createdAt)], ['Bank guarantee', `${p.bankGuarantee?.bankName} / ${p.bankGuarantee?.referenceNumber}`]]} />
                <p className="mt-5 whitespace-pre-wrap text-sm text-ink-2">{p.description}</p>
              </Panel>
              {(p.documents || []).length > 0 && (
                <Panel title="Documents">
                  <ul className="grid gap-2">{p.documents.map((d: any, i: number) => <li key={i}><a href={d.url} className="link text-sm" target="_blank">{d.name || d.type}</a></li>)}</ul>
                </Panel>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'updates' && (
        <Panel pad={false}>
          {(p.updates || []).length ? (
            <ol className="divide-y divide-line">
              {[...p.updates].sort((a: any, b: any) => +new Date(b.postedAt) - +new Date(a.postedAt)).map((u: any, i: number) => (
                <li key={i} className="px-5 py-5 sm:px-6">
                  <p className="text-sm text-muted">{formatDate(u.postedAt)}</p>
                  <p className="mt-1 font-semibold">{u.title}</p>
                  <p className="mt-2 whitespace-pre-wrap text-ink-2">{u.content}</p>
                  {(u.images || []).length > 0 && (
                    <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{u.images.map((src: string) => <li key={src} className="aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-mist">{/* eslint-disable-next-line @next/next/no-img-element */}<a href={src} target="_blank"><img src={src} alt="" className="h-full w-full object-cover" /></a></li>)}</ul>
                  )}
                </li>
              ))}
            </ol>
          ) : <EmptyState title="No updates yet" body="Your project manager posts progress reports and site photos here." />}
        </Panel>
      )}

      {tab === 'financials' && (
        <div className="grid gap-6">
          <StatGrid cols={3}>
            <Stat label="Budget" value={naira(p.budget?.total || p.projectValue)} />
            <Stat label="Spent" value={naira(spent)} />
            <Stat label="Remaining" value={naira((p.budget?.total || p.projectValue) - spent)} accent />
          </StatGrid>
          <Panel title="Expenses" pad={false}>
            {(p.budget?.expenses || []).length ? (
              <Table head={['Date', 'Category', 'Description', 'Amount']}>
                {p.budget.expenses.map((x: any, i: number) => <tr key={i}><td>{formatDate(x.date)}</td><td className="text-muted">{x.category}</td><td>{x.description}{x.receipt && <> <a className="link text-sm" href={x.receipt} target="_blank">receipt</a></>}</td><td className="font-semibold">{naira(x.amount)}</td></tr>)}
              </Table>
            ) : <EmptyState title="No expenses recorded yet" />}
          </Panel>
        </div>
      )}
    </>
  )
}
