import Link from 'next/link'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  intro,
  crumbs,
  children,
}: {
  title: string
  intro?: ReactNode
  crumbs?: { label: string; href?: string }[]
  children?: ReactNode
}) {
  return (
    <section className="border-b border-line">
      <div className="wrap pb-10 pt-10 md:pb-14 md:pt-14">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>/</span>}
                  {c.href ? <Link href={c.href} className="hover:text-ink">{c.label}</Link> : <span aria-current="page" className="text-ink-2">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="t-1 max-w-4xl">{title}</h1>
        {intro && <div className="lede mt-4">{intro}</div>}
        {children}
      </div>
    </section>
  )
}
