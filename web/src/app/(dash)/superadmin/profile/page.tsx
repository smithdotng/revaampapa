import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { SettingsPage } from '@/components/dash/SettingsPage'

export const metadata: Metadata = { title: 'Profile' }

export default async function Profile() {
  const v = await requireAdmin()
  return <SettingsPage viewer={v} />
}
