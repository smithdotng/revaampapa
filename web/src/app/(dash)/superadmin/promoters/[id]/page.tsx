import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { EarnerDetail } from '../../_parts/EarnerDetail'

export const metadata: Metadata = { title: 'Promoter' }

export default async function Promoter({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  return <EarnerDetail id={(await params).id} type="promoter" />
}
