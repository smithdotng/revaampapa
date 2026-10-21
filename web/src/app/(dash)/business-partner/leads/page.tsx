import type { Metadata } from 'next'
import { EarnLeads } from '@/components/earn/Leads'

export const metadata: Metadata = { title: 'Leads' }

export default async function Page() {
  return <EarnLeads role="business_partner" />
}
