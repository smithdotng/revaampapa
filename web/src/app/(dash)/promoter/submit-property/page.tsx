import type { Metadata } from 'next'
import { EarnIntroduce } from '@/components/earn/Introduce'

export const metadata: Metadata = { title: 'Introduce a property' }

export default async function Page() {
  return <EarnIntroduce role="promoter" kind="property" />
}
