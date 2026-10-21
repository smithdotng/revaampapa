import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { DashHeader } from '@/components/dash/ui'
import { HotelForm } from '@/components/admin/Forms'

export const metadata: Metadata = { title: 'Edit hotel' }

export default async function EditHotel({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const h = await Models.Hotel.findById(id).lean()
  if (!h) notFound()
  const hotel = plain<Record<string, unknown> & { name: string; slug?: string; isActive?: boolean }>(h)
  return (
    <>
      <DashHeader back={{ label: '← Hotels', href: '/superadmin/hotels' }} title={hotel.name}
        actions={hotel.slug && hotel.isActive ? <Link href={`/hotels/${hotel.slug}`} className="btn btn-ghost" target="_blank">View on site</Link> : undefined} />
      <HotelForm hotel={hotel} />
    </>
  )
}
