'use client'
import { useActionState, useState, type FormEvent } from 'react'
import { submitBankGuarantee } from '@/actions/subscriber'
import { initialState } from '@/lib/form'
import { Field, FileField, SubmitButton, FormAlert } from '@/components/forms'
import { submitWithUploads } from '@/lib/upload-client'

export function GuaranteeForm() {
  const [s, action, pending] = useActionState(submitBankGuarantee, initialState)
  const [busy, setBusy] = useState(false)
  const v = s.values || {}; const e = s.fieldErrors || {}
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => { ev.preventDefault(); submitWithUploads(new FormData(ev.currentTarget), action, setBusy) }
  if (s.ok) return <FormAlert message={s.message} />
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <FormAlert error={s.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Issuing bank" name="bankName" required defaultValue={v.bankName} error={e.bankName} />
        <Field label="Amount (₦)" name="guaranteeAmount" type="number" min={1} required defaultValue={v.guaranteeAmount} error={e.guaranteeAmount} />
        <Field label="Guarantee reference" name="referenceNumber" required defaultValue={v.referenceNumber} error={e.referenceNumber} className="sm:col-span-2" />
        <Field label="Issue date" name="issueDate" type="date" required defaultValue={v.issueDate} error={e.issueDate} />
        <Field label="Expiry date" name="expiryDate" type="date" required defaultValue={v.expiryDate} error={e.expiryDate} />
      </div>
      <FileField label="Guarantee document" name="document" accept=".pdf,.jpg,.jpeg,.png" hint="PDF or scan, up to 10MB" required />
      {e.document && <p className="field-hint !mt-0 !text-danger">{e.document}</p>}
      <SubmitButton pending={pending || busy} className="btn btn-primary justify-self-start" pendingText="Uploading…">Submit for verification</SubmitButton>
    </form>
  )
}
