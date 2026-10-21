import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { requireRole } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { DashHeader, Panel } from '@/components/dash/ui'
import { PayForm } from './PayForm'

export const metadata: Metadata = { title: 'Pay verification fee' }

export default async function PayVerification({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireRole('property_owner')
  const { id } = await params
  const p = await Models.Property.findById(id).select('title owner verificationPaymentConfirmed').lean().catch(() => null)
  if (!p || String(p.owner) !== v.id) notFound()
  if (p.verificationPaymentConfirmed) redirect(`/property-owner/properties/${id}`)
  return (
    <>
      <DashHeader back={{ label: 'Back to the property', href: `/property-owner/properties/${id}` }} title="Pay the verification fee" intro={<>For “{String(p.title)}”. Once we confirm the payment, our team verifies the listing within 24–48 hours.</>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-[var(--radius-lg)] bg-lagoon p-6 text-white sm:p-7">
          <p className="text-sm text-white/65">Transfer exactly</p>
          <p className="font-display text-5xl font-semibold tracking-tight">₦20,000</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[0.95rem]">
            <dt className="text-white/65">Bank</dt><dd className="font-semibold">Fidelity Bank</dd>
            <dt className="text-white/65">Account name</dt><dd className="font-semibold">Revacom Ltd</dd>
            <dt className="text-white/65">Account number</dt><dd className="font-display text-xl font-semibold tracking-wide">5601419395</dd>
          </dl>
          <p className="mt-6 text-sm text-white/70">Use the property title as the transfer narration if your bank allows it.</p>
        </section>
        <Panel title="Then tell us about the payment"><PayForm id={id} /></Panel>
      </div>
    </>
  )
}
