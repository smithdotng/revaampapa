import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { VoucherForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Room Voucher subscription' }

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  return (
    <AuthShell title="Subscribe to the Room Voucher" intro="One membership, cashback at every listed hotel. We activate your subscription and email you your membership number." aside={<RoleAside slug="room-voucher" footer="Promoters and business partners earn 50% of the subscription fee for each subscriber they introduce." />}>
      <VoucherForm referralCode={ref} />
    </AuthShell>
  )
}
