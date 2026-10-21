'use client'
import { useActionState, useState, type FormEvent } from 'react'
import { submitVerificationPayment } from '@/actions/owner'
import { initialState } from '@/lib/form'
import { Field, FileField, Checkbox, SubmitButton, FormAlert } from '@/components/forms'
import { submitWithUploads } from '@/lib/upload-client'

export function PayForm({ id }: { id: string }) {
  const [s, action, pending] = useActionState(submitVerificationPayment, initialState)
  const [busy, setBusy] = useState(false)
  const e = s.fieldErrors || {}
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => { ev.preventDefault(); submitWithUploads(new FormData(ev.currentTarget), action, setBusy) }
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <input type="hidden" name="id" value={id} />
      <FormAlert error={s.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Transfer reference" name="paymentReference" required defaultValue={s.values?.paymentReference} error={e.paymentReference} hint="From your bank app or receipt." />
        <Field label="Date paid" name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={s.values?.paymentDate} />
      </div>
      <FileField label="Receipt" name="paymentProof" accept=".pdf,.jpg,.jpeg,.png,.webp" hint="Screenshot or PDF, up to 10MB" required />
      {e.paymentProof && <p className="field-hint !mt-0 !text-danger">{e.paymentProof}</p>}
      <Checkbox name="confirm" required>I’ve transferred ₦20,000 to Revacom Ltd (Fidelity Bank, 5601419395) and the details above are correct.</Checkbox>
      {e.confirm && <p className="field-hint !mt-0 !text-danger">{e.confirm}</p>}
      <SubmitButton pending={pending || busy} pendingText="Submitting…" className="btn btn-primary justify-self-start">Submit payment proof</SubmitButton>
    </form>
  )
}
