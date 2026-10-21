'use client'
import { useActionState } from 'react'
import { requestReset, resetPassword } from '@/actions/password'
import { initialState } from '@/lib/form'
import { Field, PasswordFields, SubmitButton, FormAlert } from '@/components/forms'

export function ForgotForm() {
  const [state, action] = useActionState(requestReset, initialState)
  if (state.ok) return <FormAlert message={state.message} />
  return (
    <form action={action} className="grid gap-5">
      <FormAlert error={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} autoFocus />
      <SubmitButton pendingText="Sending link…">Email me a reset link</SubmitButton>
    </form>
  )
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, initialState)
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="token" value={token} />
      <FormAlert error={state.error} />
      <PasswordFields label="New password" error={state.fieldErrors?.password} />
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  )
}
