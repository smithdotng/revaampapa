import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { DashHeader } from '@/components/dash/ui'
import { PropertyForm } from '@/components/dash/PropertyForm'

export const metadata: Metadata = { title: 'Edit property' }

export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireRole('property_owner')
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = plain(await Models.Property.findById(id).lean().catch(() => null))
  if (!p || String(p.owner) !== v.id) notFound()
  if (p.verificationStatus === 'verified') redirect(`/property-owner/properties/${id}`)
  return (
    <>
      <DashHeader back={{ label: 'Back to the property', href: `/property-owner/properties/${id}` }} title="Edit property" />
      <PropertyForm property={p} />
    </>
  )
}
