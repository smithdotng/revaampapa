'use client'
import { useState, useTransition } from 'react'
import { LoaderCircle } from 'lucide-react'
import { startSubscription } from '@/actions/subscriber'
import type { PlanKey } from '@/lib/plans'

export function PlanButton({ plan, label, primary }: { plan: PlanKey; label: string; primary?: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  return (
    <div>
      <button type="button" disabled={pending} className={`btn w-full ${primary ? 'btn-primary' : 'btn-light'}`}
        onClick={() => start(async () => { const r = await startSubscription(plan); if (r?.error) setError(r.error) })}>
        {pending ? <><LoaderCircle className="size-4 animate-spin" /> Opening Paystack…</> : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
