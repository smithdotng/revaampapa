import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/guard'
import { DashHeader } from '@/components/dash/ui'
import { AssessmentForm } from './AssessmentForm'

export const metadata: Metadata = { title: 'New structural assessment' }

export default async function NewAssessment() {
  const v = await requireRole('architect')
  if (!v.doc.architectProfile?.isActive) redirect('/architect/dashboard')
  return (
    <>
      <DashHeader back={{ label: 'All reports', href: '/architect/dashboard' }} title="Structural assessment report" intro="Record your findings on a proposed project. The Revaamp team reviews every report." />
      <AssessmentForm />
    </>
  )
}
