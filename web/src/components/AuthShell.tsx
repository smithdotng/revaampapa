import Link from 'next/link'
import type { ReactNode } from 'react'
import { RoofMark } from './Logo'

/** Two-column frame for sign-in and registration: form on the left, context on the right. */
export function AuthShell({
  title,
  intro,
  aside,
  children,
  wide = false,
}: {
  title: string
  intro?: ReactNode
  aside: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="wrap grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
      <div className={wide ? '' : 'max-w-xl'}>
        <h1 className="t-1">{title}</h1>
        {intro && <div className="lede mt-3">{intro}</div>}
        <div className="mt-8">{children}</div>
      </div>
      <aside className="relative overflow-hidden rounded-[var(--radius-xl)] bg-lagoon p-8 text-white md:p-10 lg:sticky lg:top-24 lg:self-start">
        {aside}
        <RoofMark className="pointer-events-none absolute -bottom-8 -right-8 w-40 opacity-10" dark="#ffffff" />
      </aside>
    </div>
  )
}

export function AsideList({ title, items, footer }: { title: string; items: string[]; footer?: ReactNode }) {
  return (
    <div className="relative">
      <h2 className="t-2 text-white">{title}</h2>
      <ul className="mt-6 grid gap-3.5">
        {items.map((i) => (
          <li key={i} className="flex gap-3 text-white/80">
            <span aria-hidden className="mt-[0.65em] h-[2px] w-3 shrink-0 bg-roof" />
            {i}
          </li>
        ))}
      </ul>
      {footer && <div className="mt-8 border-t border-white/15 pt-6 text-sm text-white/70">{footer}</div>}
    </div>
  )
}

export function AlreadyHaveAccount() {
  return (
    <p className="mt-6 text-center text-[0.95rem] text-ink-2">
      Already have an account? <Link href="/login" className="link font-medium">Sign in</Link>
    </p>
  )
}
