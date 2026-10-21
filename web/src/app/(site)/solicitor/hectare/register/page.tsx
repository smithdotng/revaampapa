import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { HbhSolicitorForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Join as an HbH Solicitor' }

export default function Page() {
  return (
    <AuthShell title="Join as an HbH Solicitor" intro="Support cooperative societies in agriculture and real estate. No minimum experience required." aside={<RoleAside slug="hbh-solicitor" />}>
      <HbhSolicitorForm />
    </AuthShell>
  )
}
