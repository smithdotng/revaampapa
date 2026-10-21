'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search } from 'lucide-react'

type SelectDef = { name: string; label: string; options: [string, string][] }

/**
 * Search box plus dropdown filters that update the URL (so filtered views
 * can be bookmarked and shared). Changing any filter returns to page 1.
 */
export function Filters({ search, selects = [], dates = false }: { search?: string; selects?: SelectDef[]; dates?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const push = (patch: Record<string, string>) => {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k))
    q.delete('page')
    const s = q.toString()
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false })
  }

  return (
    <form
      role="search"
      className="mb-5 flex flex-wrap items-end gap-3"
      onSubmit={(e) => { e.preventDefault(); push({ q: String(new FormData(e.currentTarget).get('q') || '').trim() }) }}
    >
      {search && (
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">{search}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" type="search" defaultValue={params.get('q') || ''} placeholder={search} className="input min-h-11 bg-white pl-10" />
        </label>
      )}
      {selects.map((s) => (
        <label key={s.name} className="grid gap-1 text-xs font-semibold text-muted">
          {s.label}
          <select value={params.get(s.name) || ''} onChange={(e) => push({ [s.name]: e.target.value })} className="input min-h-11 w-auto bg-white py-2 text-sm font-medium text-ink">
            {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      ))}
      {dates && (
        <>
          <label className="grid gap-1 text-xs font-semibold text-muted">From
            <input type="date" defaultValue={params.get('from') || ''} onChange={(e) => push({ from: e.target.value })} className="input min-h-11 w-auto bg-white py-2 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">To
            <input type="date" defaultValue={params.get('to') || ''} onChange={(e) => push({ to: e.target.value })} className="input min-h-11 w-auto bg-white py-2 text-sm" />
          </label>
        </>
      )}
      {search && <button type="submit" className="btn btn-ghost min-h-11 px-4 text-sm">Search</button>}
    </form>
  )
}
