import { ROLES } from '@/lib/site'
import { AsideList } from './AuthShell'
import type { ReactNode } from 'react'

export function RoleAside({ slug, footer }: { slug: string; footer?: ReactNode }) {
  const r = ROLES.find((x) => x.slug === slug)!
  return (
    <div className="relative">
      <p className="font-display text-5xl font-semibold tracking-tight text-white">{r.figure}</p>
      <p className="mt-1 text-white/65">{r.figureLabel}</p>
      <div className="mt-8"><AsideList title={`As a ${r.name}`} items={r.benefits} footer={footer} /></div>
    </div>
  )
}
