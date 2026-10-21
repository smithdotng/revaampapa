import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { OwnerForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Register as a property owner' }

export default function Page() {
  return (
    <AuthShell title="List your property" intro="Create a free owner account. You pay the ₦20,000 verification fee only when you list a property." aside={<RoleAside slug="property-owner" />}>
      <OwnerForm />
    </AuthShell>
  )
}
