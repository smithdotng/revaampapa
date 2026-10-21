import Link from 'next/link'
import { MapPin, BedDouble, Bath, Ruler } from 'lucide-react'
import type { PropertySummary } from '@/lib/data'
import { naira, place, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'
import { SmartImage } from './SmartImage'

export function PropertyCard({ p, priority = false }: { p: PropertySummary; priority?: boolean }) {
  const f = p.features || {}
  const facts = [
    f.bedrooms ? { icon: BedDouble, text: `${f.bedrooms} bed` } : null,
    f.bathrooms ? { icon: Bath, text: `${f.bathrooms} bath` } : null,
    f.landArea ? { icon: Ruler, text: `${Number(f.landArea).toLocaleString()} m²` } : f.floorArea ? { icon: Ruler, text: `${Number(f.floorArea).toLocaleString()} m²` } : null,
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[]

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-mist">
        <SmartImage
          src={p.image}
          alt={p.title}
          priority={priority}
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink">
          {TRANSACTION_TYPES[p.transactionType] || p.transactionType}
        </span>
        {p.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-roof px-3 py-1 text-xs font-semibold text-white">Featured</span>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <p className="font-display text-[1.375rem] font-semibold tracking-tight text-ink">
          {naira(p.price)}
          {p.transactionType === 'rent' && <span className="font-sans text-sm font-medium text-muted"> /year</span>}
          {p.propertyType === 'shortlet' && <span className="font-sans text-sm font-medium text-muted"> /night</span>}
        </p>
        <h3 className="mt-1 font-sans text-base font-semibold leading-snug tracking-normal text-ink">
          <Link href={`/properties/${p.slug}`} className="line-clamp-2 after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{place(p.location) || 'Nigeria'}</span>
          <span aria-hidden className="text-line-2">/</span>
          <span>{PROPERTY_TYPES[p.propertyType] || p.propertyType}</span>
        </p>
        {facts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-ink-2">
            {facts.map((x) => (
              <li key={x.text} className="flex items-center gap-1.5">
                <x.icon className="size-4 text-muted" aria-hidden /> {x.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
