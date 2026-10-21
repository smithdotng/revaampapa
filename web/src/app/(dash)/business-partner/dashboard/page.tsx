import type { Metadata } from 'next'
import { EarnOverview } from '@/components/earn/Overview'

export const metadata: Metadata = { title: 'Overview' }

export default async function Page() {
  return <EarnOverview role="business_partner" />
}
