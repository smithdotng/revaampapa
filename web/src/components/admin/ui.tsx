import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { mediaUrl } from '@/lib/format'

/** Name + secondary line, used as the first cell of most admin tables. */
export function Who({ name, sub, href }: { name: ReactNode; sub?: ReactNode; href?: string }) {
  return (
    <div className="min-w-0">
      {href ? <Link href={href} className="font-semibold text-ink hover:text-teal-ink">{name}</Link> : <p className="font-semibold text-ink">{name}</p>}
      {sub && <p className="truncate text-sm text-muted">{sub}</p>}
    </div>
  )
}

/** Compact pager for admin tables (sits under the table, not centred like the site's). */
export function Pager({ page, pages, total, base, params }: { page: number; pages: number; total: number; base: string; params: Record<string, string | undefined> }) {
  if (total === 0) return null
  const href = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && k !== 'page') q.set(k, v)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return s ? `${base}?${s}` : base
  }
  const cell = 'grid size-10 place-items-center rounded-full border border-line-2 text-ink hover:border-ink'
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
      <span>{total.toLocaleString('en-NG')} {total === 1 ? 'result' : 'results'}{pages > 1 && ` · page ${page} of ${pages}`}</span>
      {pages > 1 && (
        <span className="flex gap-2">
          {page > 1 ? <Link href={href(page - 1)} className={cell} aria-label="Previous page"><ChevronLeft className="size-4" /></Link> : <span className={`${cell} opacity-30`} aria-hidden><ChevronLeft className="size-4" /></span>}
          {page < pages ? <Link href={href(page + 1)} className={cell} aria-label="Next page"><ChevronRight className="size-4" /></Link> : <span className={`${cell} opacity-30`} aria-hidden><ChevronRight className="size-4" /></span>}
        </span>
      )}
    </div>
  )
}

/** Link to an uploaded document (receipt, certificate, guarantee). */
export function DocLink({ url, label }: { url?: string | null; label: string }) {
  if (!url) return <span className="text-sm text-muted">Not provided</span>
  return (
    <a href={mediaUrl(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-ink hover:text-ink">
      <FileText className="size-4" aria-hidden /> {label}
    </a>
  )
}

/** Row of actions under a queue item. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-2">{children}</div>
}

/** One application / request in a review queue: details on the left, actions on the right. */
export function QueueItem({ title, meta, children, actions, aside }: { title: ReactNode; meta?: ReactNode; children?: ReactNode; actions?: ReactNode; aside?: ReactNode }) {
  return (
    <li className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-sans text-[1.02rem] font-semibold tracking-normal text-ink">{title}</h3>
          {aside}
        </div>
        {meta && <p className="mt-0.5 text-sm text-muted">{meta}</p>}
        {children && <div className="mt-3 text-[0.925rem] text-ink-2">{children}</div>}
      </div>
      {actions && <div className="lg:max-w-[420px] lg:justify-self-end">{actions}</div>}
    </li>
  )
}

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {items.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
        <div key={k} className="flex min-w-0 gap-2 text-sm">
          <dt className="shrink-0 text-muted">{k}</dt>
          <dd className="min-w-0 truncate font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
