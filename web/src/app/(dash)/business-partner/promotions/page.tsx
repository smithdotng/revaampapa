import type { Metadata } from 'next'
import { EarnPromotions } from '@/components/earn/Promotions'

export const metadata: Metadata = { title: 'My links' }

export default async function Page() {
  return <EarnPromotions role="business_partner" />
}
