import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { DashHeader } from '@/components/dash/ui'
import { BidNoticeForm } from '@/components/admin/Forms'

export const metadata: Metadata = { title: 'New bid notice' }

export default async function CreateBidNotice() {
  await requireAdmin()
  return (
    <>
      <DashHeader back={{ label: '← Bid notices', href: '/superadmin/bid-notices' }} title="New bid notice" />
      <BidNoticeForm />
    </>
  )
}
