import Link from 'next/link'
import { MapPin, Star } from 'lucide-react'
import type { HotelSummary } from '@/lib/data'
import { place } from '@/lib/format'
import { SmartImage } from './SmartImage'

export function HotelCard({ h, showCashback = true }: { h: HotelSummary; showCashback?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--radius-md)] bg-mist">
        <SmartImage
          src={h.image}
          alt={h.name}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
        />
        {showCashback && h.voucherDiscountRate > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-lagoon px-3 py-1 text-xs font-semibold text-white">
            {h.voucherDiscountRate}% Room Voucher cashback
          </span>
        )}
      </div>
      <div className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-sans text-lg font-semibold leading-snug tracking-normal text-ink">
            <Link href={`/hotels/${h.slug}`} className="after:absolute after:inset-0">{h.name}</Link>
          </h3>
          {h.rating > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink-2">
              <Star className="size-4 fill-roof text-roof" aria-hidden /> {h.rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4" aria-hidden /> {place(h.location) || h.location.country || 'Nigeria'}
        </p>
      </div>
    </article>
  )
}
