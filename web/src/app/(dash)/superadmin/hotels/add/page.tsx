import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { DashHeader } from '@/components/dash/ui'
import { HotelForm } from '@/components/admin/Forms'

export const metadata: Metadata = { title: 'Add a hotel' }

export default async function AddHotel() {
  await requireAdmin()
  return (
    <>
      <DashHeader back={{ label: '← Hotels', href: '/superadmin/hotels' }} title="Add a hotel" intro="Promoters get a tracked link to it straight away." />
      <HotelForm />
    </>
  )
}
