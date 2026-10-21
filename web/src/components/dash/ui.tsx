import Link from 'next/link'
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/roles'

export function DashHeader({ title, intro, actions, back }: { title: string; intro?: ReactNode; actions?: ReactNode; back?: { label: string; href: string } }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {back && <Link href={back.href} className="mb-2 inline-block text-sm text-muted hover:text-ink">{back.label}</Link>}
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-[-0.025em] sm:text-[2.25rem]">{title}</h1>
        {intro && <div className="mt-2 text-ink-2">{intro}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Stat({ label, value, hint, accent = false }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[var(--radius-md)] border p-4 sm:p-5 ${accent ? 'border-lagoon bg-lagoon text-white' : 'border-line bg-white'}`}>
      <p className={`text-sm ${accent ? 'text-white/70' : 'text-muted'}`}>{label}</p>
      <p className="mt-1 break-words font-display text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-[1.75rem]">{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? 'text-white/65' : 'text-muted'}`}>{hint}</p>}
    </div>
  )
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = cols === 4 ? 'grid-cols-2 xl:grid-cols-4' : cols === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
  return <div className={`grid gap-3 sm:gap-4 ${c}`}>{children}</div>
}

export function Panel({ title, intro, action, children, className = '', pad = true }: { title?: ReactNode; intro?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`min-w-0 rounded-[var(--radius-lg)] border border-line bg-white ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="font-sans text-[1.05rem] font-semibold tracking-normal text-ink">{title}</h2>}
            {intro && <p className="mt-0.5 text-sm text-muted">{intro}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={pad ? 'p-5 sm:p-6' : ''}>{children}</div>
    </section>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

const TONES = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-roof-soft text-[#a24d0e]',
  bad: 'bg-danger-soft text-danger',
  info: 'bg-mist text-lagoon',
  muted: 'bg-paper text-muted border border-line',
}

export function StatusPill({ status, label }: { status?: string; label?: string }) {
  const s = status || 'pending'
  const tone = STATUS_TONE[s] || 'muted'
  const text = label || STATUS_LABEL[s] || s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{text}</span>
}

/**
 * Data table. On phones each row becomes a stacked card (header text shown
 * above each value) instead of a table that scrolls sideways.
 */
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  const labels = head.map((h) => (typeof h === 'string' ? h : ''))
  const rows = Children.map(children, (row) => {
    if (!isValidElement<{ children?: ReactNode }>(row) || row.type !== 'tr') return row
    let i = 0
    const cells = Children.map(row.props.children, (cell) => {
      if (!isValidElement(cell)) return cell
      const first = i === 0
      const label = labels[i++] || ''
      const el = cell as ReactElement<{ children?: ReactNode }>
      // Labelled cells get one wrapper so the phone layout is "label | value"
      return first || !label
        ? cloneElement(el, { 'data-label': label } as object)
        : cloneElement(el, { 'data-label': label } as object, <div className="min-w-0">{el.props.children}</div>)
    })
    return cloneElement(row, {}, cells)
  })
  return (
    <div className="md:overflow-x-auto">
      <table className="rv-table w-full border-collapse text-left text-[0.925rem] md:min-w-[640px]">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            {head.map((h, i) => <th key={i} scope="col" className="whitespace-nowrap px-5 py-3 font-semibold first:pl-6 last:pr-6">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line md:[&_td]:px-5 md:[&_td]:py-3.5 md:[&_td:first-child]:pl-6 md:[&_td:last-child]:pr-6">{rows}</tbody>
      </table>
      {empty}
    </div>
  )
}

export function Tabs({ items }: { items: { label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <nav aria-label="Sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? 'page' : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.95rem] font-medium ${t.active ? 'border-roof text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-paper px-1.5 text-xs text-muted">{t.count}</span>}
        </Link>
      ))}
    </nav>
  )
}

/** Simple monthly bars. Values in naira; labels under each bar. */
export function Bars({ data, format, emptyText = 'No earnings recorded in the last six months yet.' }: { data: { label: string; value: number }[]; format: (n: number) => string; emptyText?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const allZero = data.every((d) => d.value === 0)
  return (
    <figure>
      <div className={`flex h-44 items-end ${data.length > 8 ? 'gap-1 sm:gap-2' : 'gap-3'}`} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
        {data.map((d, i) => {
          // Label only the peak and the latest month; the rest show on hover
          const labelled = d.value > 0 && (d.value === max || i === data.length - 1)
          return (
            <div key={d.label} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${d.label}: ${format(d.value)}`}>
              <span className={`text-xs font-medium text-ink-2 ${labelled ? '' : 'opacity-0 group-hover:opacity-100'}`}>{format(d.value)}</span>
              <div className="w-full max-w-12 rounded-t-[4px] bg-lagoon transition-colors group-hover:bg-lagoon-3" style={{ height: `${Math.max(d.value ? 4 : 2, (d.value / max) * 100)}%`, opacity: d.value ? 1 : 0.15 }} />
            </div>
          )
        })}
      </div>
      <div className={`mt-2 flex border-t border-line pt-2 ${data.length > 8 ? 'gap-1 sm:gap-2' : 'gap-3'}`}>
        {/* With many bars, label every other one on phones so they don't collide */}
        {data.map((d, i) => <span key={d.label} className={`min-w-0 flex-1 text-center text-[0.7rem] leading-tight text-muted sm:text-xs ${data.length > 8 && i % 2 ? 'invisible sm:visible' : ''}`}>{d.label}</span>)}
      </div>
      {allZero && <figcaption className="mt-3 text-sm text-muted">{emptyText}</figcaption>}
    </figure>
  )
}

export function KeyValue({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(140px,auto)_1fr]">
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-sm text-muted">{k}</dt>
          <dd className="text-[0.95rem] font-medium text-ink">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
