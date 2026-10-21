import type { Metadata } from 'next'
import { AuthShell } from '@/components/AuthShell'
import { RoleAside } from '@/components/RoleAside'
import { BusinessPartnerForm } from '@/components/RegisterForms'

export const metadata: Metadata = { title: 'Apply as a Business Partner' }

export default async function Page({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  return (
    <AuthShell wide title="Become a Business Partner" intro="Everything promoters earn, plus partner referrals, supply contracts and white-label tools." aside={<RoleAside slug="business-partner" />}>
      <BusinessPartnerForm
        referralCode={ref}
        bank={
          <dl className="grid gap-x-6 gap-y-2 rounded-[var(--radius-md)] bg-mist p-5 text-[0.95rem] sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">Bank</dt><dd className="font-semibold">Fidelity Bank</dd>
            <dt className="text-muted">Account name</dt><dd className="font-semibold">Revacom Ltd</dd>
            <dt className="text-muted">Account number</dt><dd className="font-display text-xl font-semibold tracking-wide">5601419395</dd>
            <dt className="text-muted">Amount</dt><dd className="font-semibold">₦20,000</dd>
          </dl>
        }
      />
    </AuthShell>
  )
}
