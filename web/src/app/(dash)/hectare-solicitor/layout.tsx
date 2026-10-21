import { requireRole } from '@/lib/guard'
import { DashShell } from '@/components/dash/Shell'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await requireRole('hectare_solicitor')
  const on = !!v.doc.hectareProfile?.isActive
  return <DashShell viewer={v} status={{ label: on ? 'Active' : 'Pending approval', tone: on ? 'ok' : 'warn' }}>{children}</DashShell>
}
