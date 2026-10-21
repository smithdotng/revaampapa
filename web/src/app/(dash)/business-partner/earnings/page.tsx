import type { Metadata } from 'next'
import { EarnEarnings } from '@/components/earn/Earnings'

export const metadata: Metadata = { title: 'Earnings' }

export default async function Page() {
  return <EarnEarnings role="business_partner" />
}
