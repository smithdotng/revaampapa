import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, EmptyState } from '@/components/dash/ui'
import { summarise } from '../summary'
import { ReservationList } from '../ReservationList'

export const metadata: Metadata = { title: 'Room Voucher' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function VoucherDashboard() {
  const v = await requireRole('voucher_subscriber')
  const d = v.doc
  const active = d.hasActiveSubscription()
  const rs = plain<any[]>(await Models.RoomVoucherReservation.find({ subscriber: d._id }).populate('hotel', 'name slug').sort('-createdAt').lean())
  const s = summarise(rs)
  return (
    <>
      <DashHeader title={`Welcome, ${v.name.split(' ')[0]}`} intro={<>Membership number <strong className="font-semibold text-ink">{d.subscriberCode}</strong>. Register every stay before check-in to claim your cashback.</>}
        actions={active && <Link href="/hotels" className="btn btn-primary">Find a hotel</Link>} />
      {!active && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-roof/40 bg-roof-soft p-5 text-[#7a3a0a]">
          <p className="font-semibold">{d.subscription?.status === 'pending' ? 'Your subscription is being activated' : `Your subscription is ${d.subscription?.status || 'not active'}`}</p>
          <p className="mt-1 text-sm">You can register stays for cashback once it’s active. {d.subscription?.status === 'pending' ? 'We’ll email you as soon as it is.' : 'Contact info@revaampapa.com to renew.'}</p>
        </div>
      )}
      <StatGrid>
        <Stat label="Cashback paid to you" value={naira(s.paid)} accent />
        <Stat label="Approved, being paid" value={naira(s.approved)} />
        <Stat label="Pending confirmation" value={naira(s.pending)} />
        <Stat label="Upcoming stays" value={s.upcoming} hint={`${s.nights} nights registered`} />
      </StatGrid>
      <Panel className="mt-6" title="Recent stays" action={rs.length > 0 && <Link href="/voucher/reservations" className="text-sm font-medium text-teal-ink hover:text-ink">All reservations</Link>} pad={false}>
        {rs.length ? <ReservationList items={rs.slice(0, 6)} /> : (
          <EmptyState title="No stays registered yet" body="Pick any hotel in the directory, check its cashback rate and register your dates before you go." action={active && <Link href="/hotels" className="btn btn-primary">Browse hotels</Link>} />
        )}
      </Panel>
      <Panel className="mt-6" title="Your membership">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-sm text-muted">Status</dt><dd className="font-semibold capitalize">{active ? 'Active' : d.subscription?.status}</dd></div>
          <div><dt className="text-sm text-muted">Started</dt><dd className="font-semibold">{formatDate(d.subscription?.startedAt || d.subscription?.activatedAt) || '—'}</dd></div>
          <div><dt className="text-sm text-muted">Expires</dt><dd className="font-semibold">{formatDate(d.subscription?.expiresAt) || '—'}</dd></div>
        </dl>
      </Panel>
    </>
  )
}
