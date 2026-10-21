import type { Metadata } from 'next'
import { EarnAnalytics } from '@/components/earn/Analytics'

export const metadata: Metadata = { title: 'Activity' }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return <EarnAnalytics role="promoter" tab={(sp.tab as 'clicks') || 'clicks'} period={sp.period || 'month'} />
}
