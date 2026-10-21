import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { PartnerHotelForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Become a Revaamp Partner Hotel' }

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  return (
    <AuthShell wide title="List your hotel" intro="Tell us about your hotel. Once approved, it’s published to the Revaamp directory and your rooms get off-taken by Revaamp." aside={<RoleAside slug="partner-hotel" footer="Partner hotels don’t have a sign-in area. We contact you by email about your application and listing." />}>
      <PartnerHotelForm referralCode={ref} />
    </AuthShell>
  )
}
