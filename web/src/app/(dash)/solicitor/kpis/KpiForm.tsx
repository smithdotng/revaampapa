'use client'
import { useActionState } from 'react'
import { updateKpis } from '@/actions/pro'
import { initialState } from '@/lib/form'
import { Field, SubmitButton, FormAlert } from '@/components/forms'

export function KpiForm({ k }: { k: { transactionsInitiated?: number; promotersOnboarded?: number; cooperativeSocietiesEstablished?: number } }) {
  const [s, action] = useActionState(updateKpis, initialState)
  return (
    <form action={action} className="grid gap-5">
      <FormAlert error={s.error} message={s.ok ? s.message : undefined} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Transactions initiated" name="transactionsInitiated" type="number" min={0} defaultValue={String(k.transactionsInitiated || 0)} hint="Target: 4 a quarter" />
        <Field label="Promoters onboarded" name="promotersOnboarded" type="number" min={0} defaultValue={String(k.promotersOnboarded || 0)} hint="Target: 15 a quarter" />
        <Field label="Cooperatives established" name="cooperativeSocieties" type="number" min={0} defaultValue={String(k.cooperativeSocietiesEstablished || 0)} />
      </div>
      <SubmitButton className="btn btn-primary justify-self-start" pendingText="Saving…">Save KPIs</SubmitButton>
    </form>
  )
}
