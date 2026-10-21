'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { checkSubscriber } from '@/actions/voucher'
import { initialState } from '@/lib/form'
import { SubmitButton } from '@/components/forms'

export function VoucherCheck() {
  const [state, action] = useActionState(checkSubscriber, initialState)
  return (
    <form action={action} className="grid gap-3">
      <label htmlFor="identifier" className="text-sm font-medium text-white/85">Email or membership number</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id="identifier" name="identifier" required defaultValue={state.values?.identifier} placeholder="you@email.com or RV-XXXXXX"
          className="input min-w-0 flex-1 border-white/20 bg-white" aria-invalid={state.error ? true : undefined} aria-describedby="identifier-msg" />
        <SubmitButton className="btn btn-light shrink-0" pendingText="Checking…">Show my cashback</SubmitButton>
      </div>
      <p id="identifier-msg" role={state.error ? 'alert' : undefined} className={`text-sm ${state.error ? 'font-medium text-[#ffd2c2]' : 'text-white/60'}`}>
        {state.error || <>Not subscribed yet? <Link href="/voucher/register" className="text-white underline underline-offset-2">Join the Room Voucher</Link>.</>}
      </p>
    </form>
  )
}
