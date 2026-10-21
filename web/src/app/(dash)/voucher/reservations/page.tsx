import type { Metadata } from 'next'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { DashHeader, Panel, EmptyState, Tabs } from '@/components/dash/ui'
import { ReservationList } from '../ReservationList'

export const metadata: Metadata = { title: 'Reservations' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Reservations({ searchParams }: { searchParams: Promise<{ status?: string; cashback?: string }> }) {
  const v = await requireRole('voucher_subscriber')
  const { status, cashback } = await searchParams
  const all = plain<any[]>(await Models.RoomVoucherReservation.find({ subscriber: v.doc._id }).populate('hotel', 'name slug').sort('-checkInDate').lean())
  const list = all.filter((r) => (!status || r.status === status) && (!cashback || r.cashbackStatus === cashback))
  const t = (label: string, q: string, active: boolean, count: number) => ({ label, href: q ? `?${q}` : '?', active, count })
  return (
    <>
      <DashHeader title="Reservations" intro="Every stay you’ve registered and where its cashback is." />
      <Tabs items={[
        t('All', '', !status && !cashback, all.length),
        t('Upcoming', 'status=registered', status === 'registered', all.filter((r) => r.status === 'registered').length),
        t('Stayed', 'status=stayed', status === 'stayed', all.filter((r) => r.status === 'stayed').length),
        t('Cashback paid', 'cashback=paid', cashback === 'paid', all.filter((r) => r.cashbackStatus === 'paid').length),
        t('Cancelled', 'status=cancelled', status === 'cancelled', all.filter((r) => r.status === 'cancelled').length),
      ]} />
      <Panel pad={false}>{list.length ? <ReservationList items={list} /> : <EmptyState title="Nothing here" />}</Panel>
    </>
  )
}
