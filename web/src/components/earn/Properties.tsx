import { Search } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { baseUrl } from '@/lib/guard'
import { shareMessage, type EarnRole } from '@/lib/earn'
import { naira, place, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'
import { DashHeader, Panel, EmptyState } from '@/components/dash/ui'
import { SmartImage } from '@/components/SmartImage'
import { PromoteButton } from './PromoteButton'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function EarnProperties({ role, q, type }: { role: EarnRole; q?: string; type?: string }) {
  const v = await requireRole(role)
  const query: any = { verificationStatus: 'verified', status: 'available' }
  if (type && PROPERTY_TYPES[type]) query.propertyType = type
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    query.$or = [{ title: rx }, { 'location.city': rx }, { 'location.state': rx }]
  }
  const [props, promos] = await Promise.all([
    Models.Property.find(query).select('title slug price images propertyType transactionType location agencyFee featured').sort({ featured: -1, createdAt: -1 }).limit(60).lean(),
    Models.Promotion.find({ promoter: v.id }).select('property referralCode').lean(),
  ])
  const linkFor = new Map(plain<any[]>(promos).map((p) => [String(p.property), `${baseUrl()}/r/${p.referralCode}`]))
  const list = plain<any[]>(props)
  return (
    <>
      <DashHeader title="Promote properties" intro="Get a link for any verified listing. Every click and enquiry through it is credited to you." />
      <form className="mb-6 flex flex-col gap-3 sm:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Title, city or state" className="input pl-12" />
        </label>
        <select name="type" defaultValue={type || ''} className="input sm:w-52" aria-label="Property type">
          <option value="">All types</option>
          {Object.entries(PROPERTY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="btn btn-primary">Search</button>
      </form>
      {list.length === 0 ? (
        <Panel><EmptyState title="No verified properties match" body="Try a different search, or check back — new listings are verified every week." /></Panel>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const img = (p.images || []).find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url
            return (
              <li key={p._id} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white">
                <div className="relative aspect-[16/10] bg-mist">
                  <SmartImage src={img} alt={p.title} sizes="(min-width: 1280px) 360px, 50vw" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold">{TRANSACTION_TYPES[p.transactionType]}</span>
                  {linkFor.has(String(p._id)) && <span className="absolute right-3 top-3 rounded-full bg-lagoon px-2.5 py-0.5 text-xs font-semibold text-white">You’re promoting</span>}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <p className="font-display text-xl font-semibold tracking-tight">{naira(p.price)}</p>
                    <a href={`/properties/${p.slug}`} target="_blank" className="mt-0.5 line-clamp-2 font-semibold hover:underline">{p.title}</a>
                    <p className="mt-1 text-sm text-muted">{place(p.location)} / {PROPERTY_TYPES[p.propertyType]}</p>
                    <p className="mt-2 text-sm text-ink-2">Agency fee <strong>{naira(p.agencyFee || p.price * 0.1)}</strong></p>
                  </div>
                  <div className="mt-auto"><PromoteButton propertyId={p._id} existing={linkFor.get(String(p._id))} message={shareMessage(p)} /></div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
