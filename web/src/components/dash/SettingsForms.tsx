'use client'
import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { updateProfile, changePassword, updateBank } from '@/actions/account'
import { initialState } from '@/lib/form'
import { Field, SubmitButton, FormAlert } from '@/components/forms'

type ProfileField = { name: string; label: string; value?: string; optional?: boolean; type?: string; hint?: string; readOnly?: boolean }

function Card({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-7 lg:grid-cols-[240px_1fr] lg:gap-10">
      <div>
        <h2 className="font-sans text-[1.05rem] font-semibold tracking-normal">{title}</h2>
        {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      </div>
      <div>{children}</div>
    </section>
  )
}

export function ProfileForm({ fields, email }: { fields: ProfileField[]; email: string }) {
  const [s, action] = useActionState(updateProfile, initialState)
  const v = s.values || {}
  return (
    <Card title="Profile" intro="How we address you and reach you about deals.">
      <form action={action} className="grid gap-5">
        <FormAlert error={s.error} message={s.ok ? s.message : undefined} />
        <Field label="Email" name="_email" value={email} readOnly disabled hint="Email can’t be changed here. Write to support@revaampapa.com if it needs updating." />
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.name} label={f.label} name={f.name} type={f.type || 'text'} optional={f.optional} hint={f.hint}
              defaultValue={v[f.name] ?? f.value ?? ''} error={s.fieldErrors?.[f.name]} required={!f.optional} />
          ))}
        </div>
        <SubmitButton className="btn btn-primary justify-self-start" pendingText="Saving…">Save profile</SubmitButton>
      </form>
    </Card>
  )
}

export function PasswordForm() {
  const [s, action] = useActionState(changePassword, initialState)
  const [show, setShow] = useState(false)
  const t = show ? 'text' : 'password'
  return (
    <Card title="Password" intro="At least 8 characters. You’ll stay signed in on this device.">
      <form action={action} className="grid gap-5" key={s.ok ? 'done' : 'form'}>
        <FormAlert error={s.error} message={s.ok ? s.message : undefined} />
        <Field label="Current password" name="currentPassword" type={t} autoComplete="current-password" required error={s.fieldErrors?.currentPassword} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="New password" name="password" type={t} autoComplete="new-password" minLength={8} required error={s.fieldErrors?.password} />
          <Field label="Confirm new password" name="confirmPassword" type={t} autoComplete="new-password" required />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton className="btn btn-primary" pendingText="Changing…">Change password</SubmitButton>
          <button type="button" onClick={() => setShow((x) => !x)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{show ? 'Hide' : 'Show'} passwords
          </button>
        </div>
      </form>
    </Card>
  )
}

export function BankForm({ bank }: { bank?: { bankName?: string; accountNumber?: string; accountName?: string } }) {
  const [s, action] = useActionState(updateBank, initialState)
  const v = s.values || {}
  return (
    <Card title="Payout account" intro="Where we send your commission. Use an account in your own name.">
      <form action={action} className="grid gap-5">
        <FormAlert error={s.error} message={s.ok ? s.message : undefined} />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Bank" name="bankName" required defaultValue={v.bankName ?? bank?.bankName} error={s.fieldErrors?.bankName} />
          <Field label="Account number" name="accountNumber" inputMode="numeric" maxLength={10} required defaultValue={v.accountNumber ?? bank?.accountNumber} error={s.fieldErrors?.accountNumber} />
          <Field label="Account name" name="accountName" required defaultValue={v.accountName ?? bank?.accountName} error={s.fieldErrors?.accountName} />
        </div>
        <SubmitButton className="btn btn-primary justify-self-start" pendingText="Saving…">Save payout account</SubmitButton>
      </form>
    </Card>
  )
}
