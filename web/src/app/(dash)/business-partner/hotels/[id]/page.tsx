import type { Metadata } from 'next'
import { EarnHotelDetail } from '@/components/earn/Hotels'

export const metadata: Metadata = { title: 'Hotel' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EarnHotelDetail role="business_partner" id={(await params).id} />
}
