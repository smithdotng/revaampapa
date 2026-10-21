import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ROLES, type Role } from '@/lib/site'

/** The nine ways to work with Revaamp, as an expandable index rather than nine cards. */
export function RolesIndex({ roles = ROLES, openFirst = false }: { roles?: Role[]; openFirst?: boolean }) {
  return (
    <ul className="border-t border-line">
      {roles.map((r, i) => (
        <li key={r.slug} id={r.slug} className="scroll-mt-28 border-b border-line">
          <details className="group" open={openFirst && i === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-4 py-6 [&::-webkit-details-marker]:hidden md:gap-8">
              <div className="min-w-0 flex-1">
                <h3 className="t-3">{r.name}</h3>
                <p className="mt-1 text-[0.95rem] text-muted">{r.summary}</p>
              </div>
              <div className="hidden w-48 shrink-0 text-right sm:block">
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">{r.figure}</p>
                <p className="text-xs leading-snug text-muted">{r.figureLabel}</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-2 transition-[transform,background-color] duration-300 group-open:rotate-45 group-open:border-ink group-open:bg-ink group-open:text-white">
                <Plus className="size-4" aria-hidden />
              </span>
            </summary>
            <div className="grid gap-6 pb-8 md:grid-cols-[1fr_auto] md:items-end">
              <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-x-8">
                {r.benefits.map((b) => (
                  <li key={b} className="flex gap-3 text-[0.95rem] text-ink-2">
                    <span aria-hidden className="mt-[0.6em] h-[2px] w-3 shrink-0 bg-roof" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href={r.cta.href} className="btn btn-primary justify-self-start">{r.cta.label}</Link>
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}
