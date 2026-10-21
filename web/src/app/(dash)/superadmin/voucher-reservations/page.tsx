import type { Metadata } from 'next'
import Link from 'next/link'
import { Models } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate, naira } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Stat, StatGrid } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { setReservationStatus, setReservationCashback } from '@/actions/admin'

export const metadata: Metadata = { title: 'Voucher stays' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; cashback?: string; q?: string }

export default async function Reservations({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const query: any = {}
  if (sp.status) query.status = sp.status
  if (sp.cashback) query.cashbackStatus = sp.cashback
  if (sp.q) query.$or = [{ reference: { $regex: sp.q.replace(/[^\w-]/g, ''), $options: 'i' } }, { guestName: { $regex: sp.q.replace(/[^\w\s-]/g, ''), $options: 'i' } }, { hotelName: { $regex: sp.q.replace(/[^\w\s-]/g, ''), $options: 'i' } }]
  const [items, all] = await Promise.all([
    Models.RoomVoucherReservation.find(query).populate('subscriber', 'name email subscriberCode').populate('hotel', 'name slug').sort('-createdAt').limit(200).lean(),
    Models.RoomVoucherReservation.find().select('status cashbackStatus cashbackAmount').lean(),
  ])
  const rows = all as any[]
  const live = rows.filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
  const sum = (l: any[]) => l.reduce((t, r) => t + (r.cashbackAmount || 0), 0)
  const list = plain<any[]>(items)

  return (
    <>
      <DashHeader title="Room Voucher stays" intro="Confirm reservations with the hotel, mark stays as completed, then approve and pay the subscriber’s cashback." />
      <StatGrid>
        <Stat label="Upcoming" value={rows.filter((r) => ['registered', 'confirmed'].includes(r.status)).length} accent />
        <Stat label="Completed stays" value={rows.filter((r) => r.status === 'stayed').length} />
        <Stat label="Cashback owed" value={naira(sum(live.filter((r) => ['pending', 'approved'].includes(r.cashbackStatus))))} />
        <Stat label="Cashback paid" value={naira(sum(rows.filter((r) => r.cashbackStatus === 'paid')))} />
      </StatGrid>
      <div className="mt-6" />
      <Filters search="Search reference, guest or hotel" selects={[
        { name: 'status', label: 'Stay', options: [['', 'All'], ['registered', 'Registered'], ['confirmed', 'Confirmed'], ['stayed', 'Stayed'], ['cancelled', 'Cancelled'], ['no_show', 'No-show']] },
        { name: 'cashback', label: 'Cashback', options: [['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['paid', 'Paid'], ['void', 'Void']] },
      ]} />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No reservations match" /> : (
          <Table head={['Reservation', 'Hotel', 'Dates', 'Stay', 'Cashback', '']}>
            {list.map((r) => (
              <tr key={r._id}>
                <td><Who name={r.guestName || r.subscriber?.name} sub={<><span className="font-mono">{r.reference}</span> · {r.subscriber?.subscriberCode}</>} /></td>
                <td className="text-ink-2">{r.hotel ? <Link href={`/hotels/${r.hotel.slug}`} className="hover:text-teal-ink" target="_blank">{r.hotel.name}</Link> : r.hotelName}</td>
                <td className="whitespace-nowrap text-sm text-ink-2">{formatDate(r.checkInDate)} → {formatDate(r.checkOutDate)}<br /><span className="text-muted">{r.nights} night{r.nights === 1 ? '' : 's'} · {r.numberOfRooms || 1} room</span></td>
                <td><StatusPill status={r.status} /></td>
                <td className="whitespace-nowrap"><StatusPill status={r.cashbackStatus} label={r.cashbackAmount ? `${naira(r.cashbackAmount)} · ${r.cashbackStatus}` : undefined} /></td>
                <td>
                  <Actions>
                    <Act action={setReservationStatus} id={r._id} label="Stay" ask={[{ name: 'status', label: 'Stay status', type: 'select', defaultValue: r.status, options: [['registered', 'Registered'], ['confirmed', 'Confirmed with hotel'], ['stayed', 'Stayed'], ['cancelled', 'Cancelled'], ['no_show', 'No-show']] }]} submitLabel="Save" />
                    {r.status === 'stayed' && r.cashbackStatus === 'pending' && <Act action={setReservationCashback} id={r._id} extra={{ cashbackStatus: 'approved' }} variant="ok" label="Approve cashback" />}
                    {r.cashbackStatus === 'approved' && <Act action={setReservationCashback} id={r._id} extra={{ cashbackStatus: 'paid' }} variant="primary" label="Mark paid" ask={[{ name: 'reference', label: 'Payment reference' }]} submitLabel="Mark paid" />}
                  </Actions>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  )
}
