import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { EarnerDetail } from '../../_parts/EarnerDetail'

export const metadata: Metadata = { title: 'Business partner' }

export default async function Partner({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  return <EarnerDetail id={(await params).id} type="business_partner" />
}
