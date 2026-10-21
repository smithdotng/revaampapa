'use client'
import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { login, type LoginState } from './actions'
import { Field, PasswordFields, SubmitButton, FormAlert, Checkbox } from '@/components/forms'

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, {})
  useEffect(() => {
    // Full page load so the header and dashboard pick up the new session
    if (state.redirectTo) window.location.assign(state.redirectTo)
  }, [state.redirectTo])

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="next" value={next || ''} />
      <FormAlert error={state.error} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={state.email} autoFocus />
      <div>
        <PasswordFields confirm={false} autoComplete="current-password" />
        <div className="mt-2 text-right"><Link href="/forgot-password" className="link text-sm">Forgot your password?</Link></div>
      </div>
      <Checkbox name="remember">Keep me signed in for 30 days</Checkbox>
      <SubmitButton pendingText={state.redirectTo ? 'Opening your dashboard…' : 'Signing in…'}>Sign in</SubmitButton>
    </form>
  )
}
