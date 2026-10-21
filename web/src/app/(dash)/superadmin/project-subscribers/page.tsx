import type { Metadata } from 'next'
import Link from 'next/link'
import { Models } from '@/lib/legacy'
import { requireAdmin, rx, qs, PENDING, adminCounts } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { PLANS } from '@/lib/plans'
import { DashHeader, Panel, EmptyState, StatusPill, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Actions, QueueItem, Facts, DocLink } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { activateSubscriber, setSubscriberGuarantee, toggleUserSuspended } from '@/actions/admin'

export const metadata: Metadata = { title: 'Project subscribers' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string }

const STATUS: Record<string, object> = {
  guarantee: PENDING.subscriber,
  active: { 'projectSubscriberProfile.subscriptionStatus': 'active' },
  inactive: { 'projectSubscriberProfile.subscriptionStatus': { $ne: 'active' } },
}

export default async function Subscribers({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const base = { userType: 'project_subscriber' }
  const query: any = { ...base, ...(STATUS[sp.status || ''] || {}) }
  if (sp.q) query.$or = [{ name: rx(sp.q) }, { email: rx(sp.q) }, { phone: rx(sp.q) }]
  const [items, all, guarantee, active, c] = await Promise.all([
    Models.User.find(query).select('-password').sort('-createdAt').limit(100).lean(),
    Models.User.countDocuments(base),
    Models.User.countDocuments({ ...base, ...STATUS.guarantee }),
    Models.User.countDocuments({ ...base, ...STATUS.active }),
    adminCounts(),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/project-subscribers${qs({ status, q: sp.q })}`
  const planOptions = Object.entries(PLANS).map(([k, p]) => [k, `${p.name} (${naira(p.price)}/yr)`] as [string, string])

  return (
    <>
      <DashHeader title="Project subscribers" intro="Diaspora and local clients using Revaamp Project Management. Subscriptions activate automatically through Paystack."
        actions={<Link href="/superadmin/projects" className="btn btn-ghost">Projects{c.project ? ` (${c.project} to approve)` : ''}</Link>} />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'Guarantees to review', href: tab('guarantee'), active: sp.status === 'guarantee', count: guarantee },
        { label: 'Active subscription', href: tab('active'), active: sp.status === 'active', count: active },
        { label: 'No subscription', href: tab('inactive'), active: sp.status === 'inactive', count: all - active },
      ]} />
      <Filters search="Search name, email or phone" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No subscribers here" /> : (
          <ul className="divide-y divide-line">
            {list.map((u) => {
              const p = u.projectSubscriberProfile || {}
              const bg = p.bankGuarantee || {}
              const activeSub = p.subscriptionStatus === 'active'
              return (
                <QueueItem key={u._id} title={u.name}
                  aside={<><StatusPill status={u.isSuspended ? 'suspended' : p.subscriptionStatus || 'inactive'} />{activeSub && <span className="text-sm text-muted">{PLANS[p.subscriptionPlan as keyof typeof PLANS]?.name || p.subscriptionPlan} until {formatDate(p.subscriptionExpiry)}</span>}</>}
                  meta={`${u.email} · ${u.phone || ''} · joined ${formatDate(u.createdAt)}`}
                  actions={
                    <Actions>
                      {bg.referenceNumber && bg.status === 'pending' && (
                        <>
                          <Act action={setSubscriberGuarantee} id={u._id} extra={{ status: 'approved' }} variant="ok" label="Approve guarantee" />
                          <Act action={setSubscriberGuarantee} id={u._id} extra={{ status: 'rejected' }} variant="danger" label="Reject guarantee" ask={[{ name: 'reason', label: 'Reason (emailed)', type: 'textarea', required: true }]} submitLabel="Reject" />
                        </>
                      )}
                      <Act action={activateSubscriber} id={u._id} variant={activeSub ? 'ghost' : 'primary'} label={activeSub ? 'Extend subscription' : 'Activate manually'}
                        ask={[
                          { name: 'plan', label: 'Plan', type: 'select', options: planOptions, defaultValue: p.subscriptionPlan || 'basic' },
                          { name: 'months', label: 'Months', type: 'number', defaultValue: '12', required: true },
                          { name: 'reference', label: 'Payment reference', placeholder: 'For bank transfers' },
                          { name: 'amount', label: 'Amount paid (₦)', type: 'number' },
                        ]} submitLabel="Activate" />
                      <Act action={toggleUserSuspended} id={u._id} variant={u.isSuspended ? 'ghost' : 'danger'} label={u.isSuspended ? 'Restore' : 'Suspend'} confirm={u.isSuspended ? undefined : `Suspend ${u.name}?`} submitLabel="Suspend" />
                    </Actions>
                  }>
                  <Facts items={[
                    ['Residence', p.countryOfResidence],
                    ['Projects', p.totalProjects || (p.projects || []).length || 0],
                    ['Guarantee', bg.referenceNumber ? `${bg.bankName || ''} · ${bg.referenceNumber} · ${naira(bg.amount)}` : 'Not submitted'],
                    ['Guarantee status', bg.referenceNumber ? <StatusPill key="g" status={bg.status} /> : undefined],
                    ['Valid', bg.issueDate ? `${formatDate(bg.issueDate)} – ${formatDate(bg.expiryDate)}` : undefined],
                  ]} />
                  <div className="mt-2 flex flex-wrap gap-4">
                    {bg.documentUrl && <DocLink url={bg.documentUrl} label="Guarantee document" />}
                    {p.identificationDoc && <DocLink url={p.identificationDoc} label="ID document" />}
                    {p.proofOfAddress && <DocLink url={p.proofOfAddress} label="Proof of address" />}
                  </div>
                </QueueItem>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}
