import { requireRole } from '@/lib/guard'
import { DashShell } from '@/components/dash/Shell'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await requireRole('property_owner')
  return <DashShell viewer={v}>{children}</DashShell>
}
