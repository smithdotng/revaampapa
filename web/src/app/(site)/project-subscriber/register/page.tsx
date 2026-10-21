import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { ProjectSubscriberForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Project management subscription' }

export default function Page() {
  return (
    <AuthShell title="Build with Revaamp" intro="Create your subscriber account, then activate your subscription to start your project." aside={<RoleAside slug="project-subscriber" />}>
      <ProjectSubscriberForm />
    </AuthShell>
  )
}
