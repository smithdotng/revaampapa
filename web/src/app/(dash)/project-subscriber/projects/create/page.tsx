import type { Metadata } from 'next'
import Link from 'next/link'
import { requireRole } from '@/lib/guard'
import { DashHeader, Panel, EmptyState } from '@/components/dash/ui'
import { ProjectForm } from './ProjectForm'

export const metadata: Metadata = { title: 'New project' }

export default async function CreateProject() {
  const v = await requireRole('project_subscriber')
  const ok = v.doc.projectSubscriberProfile?.bankGuarantee?.status === 'approved'
  return (
    <>
      <DashHeader back={{ label: 'All projects', href: '/project-subscriber/projects' }} title="Start a project" intro="We review every project, then assign a project manager and agree milestones with you." />
      {ok ? <ProjectForm /> : (
        <Panel><EmptyState title="Your bank guarantee needs to be approved first" body="It secures construction finance for your project." action={<Link href="/project-subscriber/bank-guarantee" className="btn btn-primary">Go to bank guarantee</Link>} /></Panel>
      )}
    </>
  )
}
