import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { X } from 'lucide-react'
import { searchProperties, getPropertyStates } from '@/lib/data'
import { PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'
import { PropertySearch } from '@/components/PropertySearch'
import { PropertyCard } from '@/components/PropertyCard'
import { Pagination } from '@/components/Pagination'
import { SortSelect } from '@/components/SortSelect'

export const metadata: Metadata = {
  title: 'Verified properties for sale, rent and lease',
  description: 'Browse verified land, buildings, shops, shortlets and business complexes across Africa.',
}

type SP = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined

export default async function PropertiesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  // Old links used propertyType / transactionType / search
  const f = {
    q: one(sp.q) || one(sp.search),
    type: one(sp.type) || one(sp.propertyType),
    deal: one(sp.deal) || one(sp.transactionType),
    state: one(sp.state),
    sort: one(sp.sort),
    page: Number(one(sp.page)) || 1,
  }
  const [res, states] = await Promise.all([searchProperties(f), getPropertyStates()])
  const params = { q: f.q, type: f.type, deal: f.deal, state: f.state, sort: f.sort }

  const chips = [
    f.q && { key: 'q', label: `“${f.q}”` },
    f.type && { key: 'type', label: PROPERTY_TYPES[f.type] || f.type },
    f.deal && { key: 'deal', label: TRANSACTION_TYPES[f.deal] || f.deal },
    f.state && { key: 'state', label: f.state },
  ].filter(Boolean) as { key: keyof typeof params; label: string }[]

  const without = (key: string) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && k !== key) q.set(k, v)
    const s = q.toString()
    return s ? `/properties?${s}` : '/properties'
  }

  return (
    <>
      <section className="border-b border-line">
        <div className="wrap pb-8 pt-10 md:pt-14">
          <h1 className="t-1">Properties</h1>
          <p className="lede mt-3">Every listing here has been verified by the Revaamp team. Ask the owner a question from any listing.</p>
          <div className="mt-8">
            <PropertySearch states={states} values={params} compact />
          </div>
        </div>
      </section>

      <section className="wrap py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 font-medium text-ink" aria-live="polite">
              {res.total.toLocaleString()} {res.total === 1 ? 'property' : 'properties'}
            </p>
            {chips.map((c) => (
              <Link key={c.key} href={without(c.key)} className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-sm font-medium text-lagoon hover:bg-[#d3e9e6]">
                {c.label} <X className="size-3.5" aria-hidden /><span className="sr-only">Remove filter</span>
              </Link>
            ))}
            {chips.length > 1 && <Link href="/properties" className="link ml-1 text-sm">Clear all</Link>}
          </div>
          <Suspense>
            <SortSelect value={f.sort || ''} options={[['', 'Recommended'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']]} />
          </Suspense>
        </div>

        {res.items.length ? (
          <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {res.items.map((p, i) => <PropertyCard key={p.id} p={p} priority={i < 3} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-16 text-center">
            <h2 className="t-2">No properties match these filters</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-2">Try a nearby state, a different property type, or fewer keywords.</p>
            <Link href="/properties" className="btn btn-primary mt-6">Show all properties</Link>
          </div>
        )}
        <Pagination page={res.page} pages={res.pages} base="/properties" params={params} />
      </section>
    </>
  )
}
