import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { DashHeader } from '@/components/dash/ui'
import { PropertyForm } from '@/components/dash/PropertyForm'
import { saveAdminProperty } from '@/actions/admin-forms'

export const metadata: Metadata = { title: 'Edit property' }

export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const p = await Models.Property.findById(id).lean()
  if (!p) notFound()
  return (
    <>
      <DashHeader back={{ label: '← Back to the listing', href: `/superadmin/properties/${id}` }} title="Edit listing" />
      <PropertyForm property={plain(p)} action={saveAdminProperty} admin />
    </>
  )
}
