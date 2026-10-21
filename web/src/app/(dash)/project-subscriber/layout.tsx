import { requireRole } from '@/lib/guard'
import { DashShell } from '@/components/dash/Shell'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await requireRole('project_subscriber')
  const active = v.doc.projectSubscriberProfile?.subscriptionStatus === 'active'
  return <DashShell viewer={v} status={{ label: active ? 'Subscription active' : 'Subscription inactive', tone: active ? 'ok' : 'warn' }}>{children}</DashShell>
}
