import type { Metadata } from 'next'
import { Models } from '@/lib/legacy'
import { requireAdmin, rx, qs, PENDING } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate, naira } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { activateVoucherSubscriber, suspendVoucherSubscriber } from '@/actions/admin'

export const metadata: Metadata = { title: 'Room Voucher subscribers' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string }

const STATUS: Record<string, object> = {
  pending: PENDING.voucher,
  active: { 'subscription.status': 'active', isSuspended: { $ne: true } },
  suspended: { isSuspended: true },
}

export default async function VoucherSubscribers({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const query: any = { ...(STATUS[sp.status || ''] || {}) }
  if (sp.q) query.$or = [{ name: rx(sp.q) }, { email: rx(sp.q) }, { subscriberCode: rx(sp.q) }, { phone: rx(sp.q) }]
  const [items, all, pending, active, suspended] = await Promise.all([
    Models.VoucherSubscriber.find(query).select('-password').populate('referral.referredBy', 'name userType').sort('-createdAt').limit(200).lean(),
    Models.VoucherSubscriber.countDocuments(),
    ...['pending', 'active', 'suspended'].map((s) => Models.VoucherSubscriber.countDocuments(STATUS[s])),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/voucher-subscribers${qs({ status, q: sp.q })}`

  return (
    <>
      <DashHeader title="Room Voucher subscribers" intro="Subscribers reserve rooms at partner hotels with their voucher code and earn cashback on completed stays." />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'To activate', href: tab('pending'), active: sp.status === 'pending', count: pending },
        { label: 'Active', href: tab('active'), active: sp.status === 'active', count: active },
        { label: 'Suspended', href: tab('suspended'), active: sp.status === 'suspended', count: suspended },
      ]} />
      <Filters search="Search name, email, phone or voucher code" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No subscribers here" /> : (
          <Table head={['Subscriber', 'Code', 'Referred by', 'Joined', 'Status', '']}>
            {list.map((s) => {
              const st = s.isSuspended ? 'suspended' : s.subscription?.status || 'pending'
              return (
                <tr key={s._id}>
                  <td><Who name={s.name} sub={`${s.email} · ${s.phone || ''}`} /></td>
                  <td className="whitespace-nowrap font-mono text-sm">{s.subscriberCode}</td>
                  <td className="text-sm text-ink-2">{s.referral?.referredBy ? `${s.referral.referredBy.name}` : '—'}</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(s.createdAt)}</td>
                  <td>
                    <StatusPill status={st} />
                    {s.subscription?.expiresAt && st === 'active' && <p className="mt-1 text-xs text-muted">until {formatDate(s.subscription.expiresAt)}</p>}
                    {s.pricing?.fee ? <p className="mt-1 text-xs text-muted">Fee {naira(s.pricing.fee)} · {s.pricing.feeStatus?.replace('_', ' ')}</p> : null}
                  </td>
                  <td>
                    <Actions>
                      {st !== 'active' && <Act action={activateVoucherSubscriber} id={s._id} variant="ok" label="Activate" ask={[{ name: 'months', label: 'Months (blank for no end date)', type: 'number', placeholder: '12' }]} submitLabel="Activate" />}
                      {st !== 'suspended' && <Act action={suspendVoucherSubscriber} id={s._id} variant="danger" label="Suspend" ask={[{ name: 'reason', label: 'Reason', type: 'textarea' }]} submitLabel="Suspend" />}
                    </Actions>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Panel>
    </>
  )
}
