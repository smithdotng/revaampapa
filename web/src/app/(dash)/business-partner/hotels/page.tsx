import type { Metadata } from 'next'
import { EarnHotels } from '@/components/earn/Hotels'

export const metadata: Metadata = { title: 'Hotels' }

export default async function Page() {
  return <EarnHotels role="business_partner" />
}
