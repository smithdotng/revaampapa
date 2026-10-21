import type { Metadata } from 'next'
import { ProjectView } from '../ProjectView'

export const metadata: Metadata = { title: 'Project' }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ProjectView slug={(await params).slug} tab="updates" />
}
