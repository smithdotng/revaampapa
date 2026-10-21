import type { Metadata } from 'next'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, rx, PAGE, qs, PENDING } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Pager, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { approvePromoter, rejectPromoter, toggleUserSuspended } from '@/actions/admin'

export const metadata: Metadata = { title: 'Promoters' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string; page?: string }

const STATUS: Record<string, object> = {
  pending: PENDING.promoter,
  approved: { 'promoterProfile.isApproved': true, isSuspended: { $ne: true } },
  declined: { 'promoterProfile.rejected': true },
  suspended: { isSuspended: true },
}

function state(u: any) {
  if (u.isSuspended) return 'suspended'
  if (u.promoterProfile?.rejected) return 'rejected'
  return u.promoterProfile?.isApproved ? 'approved' : 'pending'
}

export default async function Promoters({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const base = { userType: 'promoter' }
  const query: any = { ...base, ...(STATUS[sp.status || ''] || {}) }
  if (sp.q) query.$or = [{ name: rx(sp.q) }, { email: rx(sp.q) }, { phone: rx(sp.q) }]

  const [items, total, all, pending, approved, declined, suspended] = await Promise.all([
    Models.User.find(query).select('-password').sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.User.countDocuments(query),
    Models.User.countDocuments(base),
    ...['pending', 'approved', 'declined', 'suspended'].map((s) => Models.User.countDocuments({ ...base, ...STATUS[s] })),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/promoters${qs({ status, q: sp.q })}`

  return (
    <>
      <DashHeader title="Promoters" intro="People who share listings and earn commission on the deals they bring in." />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'Awaiting approval', href: tab('pending'), active: sp.status === 'pending', count: pending },
        { label: 'Approved', href: tab('approved'), active: sp.status === 'approved', count: approved },
        { label: 'Declined', href: tab('declined'), active: sp.status === 'declined', count: declined },
        { label: 'Suspended', href: tab('suspended'), active: sp.status === 'suspended', count: suspended },
      ]} />
      <Filters search="Search name, email or phone" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No promoters here" body={sp.status === 'pending' ? 'Promoters are approved automatically when they sign up, so this is usually empty.' : 'Try a different search.'} /> : (
          <Table head={['Promoter', 'Joined', 'Earned', 'Available', 'Status', '']}>
            {list.map((u) => {
              const s = state(u)
              return (
                <tr key={u._id}>
                  <td><Who name={u.name} sub={`${u.email} · ${u.phone || ''}`} href={`/superadmin/promoters/${u._id}`} /></td>
                  <td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap">{naira(u.promoterProfile?.totalEarnings || 0)}</td>
                  <td className="whitespace-nowrap">{naira(u.promoterProfile?.pendingWithdrawal || 0)}</td>
                  <td><StatusPill status={s} label={s === 'rejected' ? 'Declined' : undefined} /></td>
                  <td>
                    <Actions>
                      {(s === 'pending' || s === 'rejected') && <Act action={approvePromoter} id={u._id} variant="ok" label="Approve" />}
                      {s === 'pending' && <Act action={rejectPromoter} id={u._id} variant="danger" label="Decline" ask={[{ name: 'reason', label: 'Reason', type: 'textarea' }]} />}
                      {s !== 'pending' && <Act action={toggleUserSuspended} id={u._id} variant={s === 'suspended' ? 'ghost' : 'danger'} label={s === 'suspended' ? 'Restore' : 'Suspend'} confirm={s === 'suspended' ? undefined : `Suspend ${u.name}? They’ll be signed out and can’t sign in until restored.`} submitLabel="Suspend" />}
                    </Actions>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/promoters" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
