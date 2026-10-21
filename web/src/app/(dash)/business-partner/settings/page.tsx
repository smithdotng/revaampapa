import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { SettingsPage } from '@/components/dash/SettingsPage'

export const metadata: Metadata = { title: 'Settings' }

export default async function Page() {
  return <SettingsPage viewer={await requireRole('business_partner')} />
}
