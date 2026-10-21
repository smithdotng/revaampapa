import type { Metadata } from 'next'
import { requireRole } from '@/lib/guard'
import { DashHeader } from '@/components/dash/ui'
import { PropertyForm } from '@/components/dash/PropertyForm'

export const metadata: Metadata = { title: 'Add property' }

export default async function AddProperty() {
  await requireRole('property_owner')
  return (
    <>
      <DashHeader back={{ label: 'All properties', href: '/property-owner/dashboard' }} title="Add a property" intro="Once saved, pay the ₦20,000 verification fee and our team reviews it within 24–48 hours." />
      <PropertyForm />
    </>
  )
}
