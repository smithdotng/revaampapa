import type { Metadata } from 'next'
import { EarnProperties } from '@/components/earn/Properties'

export const metadata: Metadata = { title: 'Promote properties' }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  return <EarnProperties role="business_partner" q={sp.q} type={sp.type} />
}
