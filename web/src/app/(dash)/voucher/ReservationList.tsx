import Link from 'next/link'
import { naira, formatDate } from '@/lib/format'
import { StatusPill } from '@/components/dash/ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ReservationList({ items }: { items: any[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li key={r._id} className="relative grid gap-2 px-5 py-4 hover:bg-paper/60 sm:px-6 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-6">
          <div className="min-w-0">
            <Link href={`/voucher/reservations/${r._id}`} className="font-semibold after:absolute after:inset-0">{r.hotel?.name || r.hotelName}</Link>
            <p className="text-sm text-muted">{formatDate(r.checkInDate)} to {formatDate(r.checkOutDate)} / {r.nights || 0} night{r.nights === 1 ? '' : 's'} / {r.reference}</p>
          </div>
          <div className="text-sm md:text-right"><span className="font-display text-lg font-semibold">{naira(r.cashbackAmount || 0)}</span><span className="block text-xs text-muted">cashback at {r.voucherDiscountRate}%</span></div>
          <div className="flex gap-2"><StatusPill status={r.status} /><StatusPill status={r.cashbackStatus} label={`Cashback ${r.cashbackStatus}`} /></div>
        </li>
      ))}
    </ul>
  )
}
