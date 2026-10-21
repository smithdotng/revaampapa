import type { Metadata } from 'next'
import { requireAdmin, adminCounts } from '@/lib/admin'
import { ROLE_CONFIG } from '@/lib/roles'
import { DashShell } from '@/components/dash/Shell'

export const metadata: Metadata = { title: { template: '%s · Superadmin · RevaampAPA', default: 'Superadmin · RevaampAPA' }, robots: { index: false } }

export default async function Layout({ children }: { children: React.ReactNode }) {
  const v = await requireAdmin()
  const c = await adminCounts()
  const badges: Record<string, number> = {
    '/superadmin/properties': c.property,
    '/superadmin/promoters': c.promoter,
    '/superadmin/business-partners': c.partner,
    '/superadmin/professionals': c.professionals,
    '/superadmin/project-subscribers': c.subscriber + c.project,
    '/superadmin/partner-hotels': c.partnerHotel,
    '/superadmin/voucher-subscribers': c.voucher,
    '/superadmin/withdrawals': c.withdrawal,
    '/superadmin/inquiries': c.inquiry,
  }
  const nav = ROLE_CONFIG.superadmin.nav.map((n) => ({ ...n, badge: badges[n.href] || 0 }))
  return <DashShell viewer={v} nav={nav}>{children}</DashShell>
}
