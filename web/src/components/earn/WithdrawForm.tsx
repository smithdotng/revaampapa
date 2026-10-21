'use client'
import { useActionState } from 'react'
import { requestWithdrawal } from '@/actions/earn'
import { initialState } from '@/lib/form'
import { Field, SubmitButton, FormAlert } from '@/components/forms'

export function WithdrawForm({ available, bank }: { available: number; bank: string }) {
  const [s, action] = useActionState(requestWithdrawal, initialState)
  return (
    <form action={action} className="grid gap-4" key={s.ok ? 'done' : 'form'}>
      <FormAlert error={s.error} message={s.ok ? s.message : undefined} />
      <Field label="Amount (₦)" name="amount" type="number" min={1} max={available} step={1} inputMode="numeric" required
        defaultValue={s.values?.amount ?? (available > 0 ? String(Math.floor(available)) : '')} error={s.fieldErrors?.amount} hint={`Paid to ${bank}`} disabled={available <= 0} />
      <SubmitButton className="btn btn-primary" pendingText="Requesting…">{available > 0 ? 'Request withdrawal' : 'Nothing to withdraw yet'}</SubmitButton>
    </form>
  )
}
