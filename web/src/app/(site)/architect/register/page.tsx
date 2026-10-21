import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { ArchitectForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Apply as a Partner Architect' }

export default function Page() {
  return (
    <AuthShell wide title="Become a Partner Architect" intro="Open to licensed architects across Africa. We review every application before activation." aside={<RoleAside slug="partner-architect" />}>
      <ArchitectForm />
    </AuthShell>
  )
}
