import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue } from '@/components/dash/ui'
import { CancelButton } from './CancelButton'

export const metadata: Metadata = { title: 'Reservation' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function Reservation({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireRole('voucher_subscriber')
  const { id } = await params
  const r: any = plain(await Models.RoomVoucherReservation.findOne({ _id: id, subscriber: v.doc._id }).populate('hotel', 'name slug location contactInfo').lean().catch(() => null))
  if (!r) notFound()
  const steps = [
    ['Registered', true],
    ['Stay confirmed by the hotel', ['confirmed', 'stayed'].includes(r.status)],
    ['Cashback approved', ['approved', 'paid'].includes(r.cashbackStatus)],
    ['Cashback paid', r.cashbackStatus === 'paid'],
  ] as const
  const dead = ['cancelled', 'no_show'].includes(r.status)
  return (
    <>
      <DashHeader back={{ label: 'All reservations', href: '/voucher/reservations' }} title={r.hotel?.name || r.hotelName}
        intro={<span className="flex flex-wrap items-center gap-3"><StatusPill status={r.status} /> Reference {r.reference}</span>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-[var(--radius-lg)] bg-lagoon p-6 text-white sm:p-7">
          <p className="text-sm text-white/65">{r.cashbackStatus === 'paid' ? 'Cashback paid' : dead ? 'No cashback for this stay' : 'Estimated cashback'}</p>
          <p className="font-display text-5xl font-semibold tracking-tight">{naira(dead ? 0 : r.cashbackAmount || 0)}</p>
          <p className="mt-2 text-sm text-white/70">{r.voucherDiscountRate}% of {naira(r.estimatedTotal || 0)} ({r.numberOfRooms} room{r.numberOfRooms > 1 ? 's' : ''}, {r.nights} night{r.nights === 1 ? '' : 's'})</p>
          {!dead && (
            <ol className="mt-6 grid gap-3">
              {steps.map(([label, done]) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span className={`grid size-6 place-items-center rounded-full ${done ? 'bg-white text-lagoon' : 'border border-white/30'}`}>{done && <Check className="size-3.5" aria-hidden />}</span>
                  <span className={done ? 'font-semibold' : 'text-white/70'}>{label}</span>
                </li>
              ))}
            </ol>
          )}
          {r.cashbackPaymentReference && <p className="mt-5 text-sm text-white/70">Payment reference {r.cashbackPaymentReference}</p>}
        </section>
        <Panel title="Stay details">
          <KeyValue items={[
            ['Check-in', formatDate(r.checkInDate)], ['Check-out', formatDate(r.checkOutDate)], ['Guest', r.guestName], ['Room type', r.roomType || '—'],
            ['Rooms / guests', `${r.numberOfRooms} / ${r.numberOfGuests}`], ['Nightly rate', r.roomRate ? naira(r.roomRate) : 'Not given'], ['Requests', r.specialRequests || '—'],
            ['Hotel contact', r.hotel?.contactInfo?.phone || r.hotel?.contactInfo?.email || '—'],
          ]} />
          {['registered', 'confirmed'].includes(r.status) && <div className="mt-6 border-t border-line pt-5"><CancelButton id={r._id} /></div>}
        </Panel>
      </div>
    </>
  )
}
