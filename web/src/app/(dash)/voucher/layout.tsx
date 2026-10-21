import { requireRole } from '@/lib/guard'
import { DashShell } from '@/components/dash/Shell'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await requireRole('voucher_subscriber')
  const on = v.doc.hasActiveSubscription()
  return <DashShell viewer={v} status={{ label: on ? `Member ${v.doc.subscriberCode}` : `Subscription ${v.doc.subscription?.status || 'pending'}`, tone: on ? 'ok' : 'warn' }}>{children}</DashShell>
}
