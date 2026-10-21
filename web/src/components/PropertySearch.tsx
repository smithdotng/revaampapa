import { Search } from 'lucide-react'
import { PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'

export function PropertySearch({
  states,
  values = {},
  compact = false,
}: {
  states: string[]
  values?: { q?: string; type?: string; deal?: string; state?: string; sort?: string }
  compact?: boolean
}) {
  return (
    <form action="/properties" method="get" role="search" aria-label="Search properties"
      className={`grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto] ${compact ? '' : 'shadow-[0_24px_60px_-30px_rgb(15_59_59/.35)]'}`}>
      <label className="relative sm:col-span-2 lg:col-span-1">
        <span className="sr-only">Keywords</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input name="q" defaultValue={values.q} placeholder="City, area or keyword" className="input border-transparent bg-paper pl-12 hover:border-transparent" />
      </label>
      <label>
        <span className="sr-only">Property type</span>
        <select name="type" defaultValue={values.type || ''} className="input border-transparent bg-paper hover:border-transparent">
          <option value="">Any type</option>
          {Object.entries(PROPERTY_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        <span className="sr-only">Deal</span>
        <select name="deal" defaultValue={values.deal || ''} className="input border-transparent bg-paper hover:border-transparent">
          <option value="">Buy, rent or lease</option>
          {Object.entries(TRANSACTION_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        <span className="sr-only">State</span>
        <select name="state" defaultValue={values.state || ''} className="input border-transparent bg-paper hover:border-transparent">
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {values.sort && <input type="hidden" name="sort" value={values.sort} />}
      <button type="submit" className="btn btn-primary sm:col-span-2 lg:col-span-1">Search</button>
    </form>
  )
}
