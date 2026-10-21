import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { requireRole } from '@/lib/guard'
import { PLANS, type PlanKey } from '@/lib/plans'
import { naira, formatDate } from '@/lib/format'
import { DashHeader } from '@/components/dash/ui'
import { PlanButton } from './PlanButton'

export const metadata: Metadata = { title: 'Subscription' }

export default async function Subscription() {
  const v = await requireRole('project_subscriber')
  const prof = v.doc.projectSubscriberProfile || {}
  const active = prof.subscriptionStatus === 'active'
  const current = (prof.subscriptionPlan || 'basic') as PlanKey
  return (
    <>
      <DashHeader title="Subscription" intro={active ? <>You’re on the <strong>{PLANS[current].name}</strong> plan until {formatDate(prof.subscriptionExpiry)}.</> : 'Choose a plan to start building with Revaamp. Billed yearly, paid securely with Paystack.'} />
      <ul className="grid gap-5 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanKey[]).map((k) => {
          const p = PLANS[k]
          const mine = active && k === current
          const rec = 'recommended' in p && p.recommended
          return (
            <li key={k} className={`flex flex-col rounded-[var(--radius-lg)] border p-6 ${rec ? 'border-lagoon bg-lagoon text-white' : 'border-line bg-white'}`}>
              <div className="flex items-center justify-between">
                <h2 className={`font-sans text-lg font-semibold tracking-normal ${rec ? 'text-white' : ''}`}>{p.name}</h2>
                {mine ? <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok">Current plan</span> : rec ? <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">Most chosen</span> : null}
              </div>
              <p className="mt-4 font-display text-4xl font-semibold tracking-tight">{naira(p.price)}<span className={`font-sans text-base font-medium ${rec ? 'text-white/65' : 'text-muted'}`}> /year</span></p>
              <ul className="mt-6 grid flex-1 gap-2.5">
                {p.features.map((f) => <li key={f} className={`flex gap-2.5 text-[0.95rem] ${rec ? 'text-white/85' : 'text-ink-2'}`}><Check className={`mt-0.5 size-4 shrink-0 ${rec ? 'text-roof' : 'text-teal-ink'}`} aria-hidden />{f}</li>)}
              </ul>
              <div className="mt-6">
                {mine ? <p className={`text-center text-sm ${rec ? 'text-white/70' : 'text-muted'}`}>Renews {formatDate(prof.subscriptionExpiry)}</p> : <PlanButton plan={k} label={active ? `Switch to ${p.name}` : `Choose ${p.name}`} primary={!rec} />}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
