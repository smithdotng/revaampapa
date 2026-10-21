import type { Metadata } from 'next'
import { EarnIntroduce } from '@/components/earn/Introduce'

export const metadata: Metadata = { title: 'Introduce a buyer' }

export default async function Page() {
  return <EarnIntroduce role="promoter" kind="buyer" />
}
