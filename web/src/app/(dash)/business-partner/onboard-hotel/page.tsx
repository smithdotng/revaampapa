import type { Metadata } from 'next'
import { EarnIntroduce } from '@/components/earn/Introduce'

export const metadata: Metadata = { title: 'Introduce a hotel' }

export default async function Page() {
  return <EarnIntroduce role="business_partner" kind="hotel" />
}
