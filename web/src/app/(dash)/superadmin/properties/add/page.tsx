import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { DashHeader } from '@/components/dash/ui'
import { PropertyForm } from '@/components/dash/PropertyForm'
import { saveAdminProperty } from '@/actions/admin-forms'

export const metadata: Metadata = { title: 'List a property' }

export default async function AddProperty() {
  await requireAdmin()
  return (
    <>
      <DashHeader back={{ label: '← Properties', href: '/superadmin/properties' }} title="List a property for an owner"
        intro="For owners who sold or let through Revaamp offline. It goes live straight away, with no verification fee." />
      <PropertyForm action={saveAdminProperty} admin />
    </>
  )
}
