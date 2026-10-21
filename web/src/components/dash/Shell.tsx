import type { ReactNode } from 'react'
import { ROLE_CONFIG, type NavItem } from '@/lib/roles'
import type { Viewer } from '@/lib/guard'
import { Sidebar } from './Sidebar'

/** Frame for every dashboard: sidebar (drawer on mobile) and a content column. */
export function DashShell({ viewer, status, nav, children }: { viewer: Viewer; status?: { label: string; tone: string }; nav?: NavItem[]; children: ReactNode }) {
  const cfg = ROLE_CONFIG[viewer.type]
  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:flex-row">
      <Sidebar nav={nav || cfg.nav} roleLabel={cfg.label} name={viewer.name} email={viewer.email} status={status} />
      <main id="main" className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
    </div>
  )
}
