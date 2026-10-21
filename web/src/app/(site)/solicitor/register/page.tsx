import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { SolicitorForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Apply as a Partner Solicitor' }

export default function Page() {
  return (
    <AuthShell wide title="Become a Partner Solicitor" intro="For solicitors with at least 10 years of practice. Applications are reviewed by our legal team." aside={<RoleAside slug="partner-solicitor" />}>
      <SolicitorForm />
    </AuthShell>
  )
}
