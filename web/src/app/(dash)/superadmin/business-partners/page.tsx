import type { Metadata } from 'next'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, rx, PAGE, qs, PENDING } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Pager, Actions, QueueItem, Facts, DocLink } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { confirmPartnerPayment, rejectPartnerPayment, toggleUserSuspended } from '@/actions/admin'

export const metadata: Metadata = { title: 'Business partners' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string; page?: string }

const ACTIVE = { $or: [{ 'businessPartnerProfile.paymentStatus': 'confirmed' }, { 'promoterProfile.paymentStatus': 'confirmed' }] }
const STATUS: Record<string, object> = {
  pending: PENDING.partner,
  active: { ...ACTIVE, isSuspended: { $ne: true } },
  rejected: { 'businessPartnerProfile.paymentStatus': 'rejected' },
  suspended: { isSuspended: true },
}

export default async function BusinessPartners({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const base = { userType: 'business_partner' }
  const query: any = { ...base, ...(STATUS[sp.status || ''] || {}) }
  if (sp.q) query.$and = [{ $or: [{ name: rx(sp.q) }, { email: rx(sp.q) }, { phone: rx(sp.q) }] }]

  const [items, total, all, pending, active, rejected, suspended] = await Promise.all([
    Models.User.find(query).select('-password').sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.User.countDocuments(query),
    Models.User.countDocuments(base),
    ...['pending', 'active', 'rejected', 'suspended'].map((s) => Models.User.countDocuments({ ...base, ...STATUS[s] })),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/business-partners${qs({ status, q: sp.q })}`
  const isPaid = (u: any) => u.businessPartnerProfile?.paymentStatus === 'confirmed' || u.promoterProfile?.paymentStatus === 'confirmed'

  return (
    <>
      <DashHeader title="Business partners" intro="Value partners who pay ₦20,000 to join, promote listings and hotels, and bid on transactions." />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'Payment to confirm', href: tab('pending'), active: sp.status === 'pending', count: pending },
        { label: 'Active', href: tab('active'), active: sp.status === 'active', count: active },
        { label: 'Not confirmed', href: tab('rejected'), active: sp.status === 'rejected', count: rejected },
        { label: 'Suspended', href: tab('suspended'), active: sp.status === 'suspended', count: suspended },
      ]} />
      <Filters search="Search name, email or phone" />

      {sp.status === 'pending' ? (
        <Panel pad={false}>
          {list.length === 0 ? <EmptyState title="No payments to confirm" body="New business partner sign-ups appear here with their proof of payment." /> : (
            <ul className="divide-y divide-line">
              {list.map((u) => {
                const bp = u.businessPartnerProfile || {}
                return (
                  <QueueItem key={u._id} title={<a href={`/superadmin/business-partners/${u._id}`} className="hover:text-teal-ink">{u.name}</a>} meta={`${u.email} · ${u.phone || ''} · signed up ${formatDate(u.createdAt)}`}
                    actions={
                      <Actions>
                        <Act action={confirmPartnerPayment} id={u._id} variant="ok" label="Confirm payment" ask={[{ name: 'note', label: 'Internal note', placeholder: 'e.g. Seen in bank statement' }]} submitLabel="Confirm and activate" />
                        <Act action={rejectPartnerPayment} id={u._id} variant="danger" label="Can’t confirm" ask={[{ name: 'reason', label: 'Reason (emailed to them)', type: 'textarea', required: true }]} submitLabel="Send" />
                      </Actions>
                    }>
                    <Facts items={[
                      ['Amount', naira(bp.paymentAmount || 20000)],
                      ['Reference', bp.paymentReference],
                      ['Paid on', formatDate(bp.paymentDate)],
                    ]} />
                    <div className="mt-2"><DocLink url={bp.paymentProofUrl} label="Open receipt" /></div>
                  </QueueItem>
                )
              })}
            </ul>
          )}
          <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/business-partners" params={sp as Record<string, string>} />
        </Panel>
      ) : (
        <Panel pad={false}>
          {list.length === 0 ? <EmptyState title="No business partners here" /> : (
            <Table head={['Partner', 'Joined', 'Payment', 'Earned', 'Status', '']}>
              {list.map((u) => {
                const paid = isPaid(u)
                return (
                  <tr key={u._id}>
                    <td><Who name={u.name} sub={`${u.email} · ${u.phone || ''}`} href={`/superadmin/business-partners/${u._id}`} /></td>
                    <td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                    <td><StatusPill status={paid ? 'confirmed' : u.businessPartnerProfile?.paymentStatus || 'pending'} /></td>
                    <td className="whitespace-nowrap">{naira(u.promoterProfile?.totalEarnings || 0)}</td>
                    <td><StatusPill status={u.isSuspended ? 'suspended' : paid ? 'active' : 'inactive'} /></td>
                    <td>
                      <Actions>
                        {!paid && <Act action={confirmPartnerPayment} id={u._id} variant="ok" label="Confirm payment" />}
                        {paid && <Act action={toggleUserSuspended} id={u._id} variant={u.isSuspended ? 'ghost' : 'danger'} label={u.isSuspended ? 'Restore' : 'Suspend'} confirm={u.isSuspended ? undefined : `Suspend ${u.name}?`} submitLabel="Suspend" />}
                      </Actions>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
          <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/business-partners" params={sp as Record<string, string>} />
        </Panel>
      )}
    </>
  )
}
