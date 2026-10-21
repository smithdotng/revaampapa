import type { Metadata } from 'next'
import { PartnerBids } from '@/components/earn/Bid'

export const metadata: Metadata = { title: 'Bids' }

export default async function Page({ searchParams }: { searchParams: Promise<{ noticeId?: string }> }) {
  return <PartnerBids noticeId={(await searchParams).noticeId} />
}
