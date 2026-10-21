import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { PromoterForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Become a Revaamp promoter — free' }

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  return (
    <AuthShell title="Become a promoter" intro="Free to join, approved instantly. Get your referral links as soon as you sign in." aside={<RoleAside slug="promoter" />}>
      <PromoterForm referralCode={ref} />
    </AuthShell>
  )
}
