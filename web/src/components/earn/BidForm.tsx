'use client'
import { useActionState, useState } from 'react'
import { placeBid } from '@/actions/earn'
import { initialState } from '@/lib/form'
import { naira } from '@/lib/format'
import { Field, TextArea, SubmitButton, FormAlert } from '@/components/forms'

export function BidForm({ noticeId, maxLots, costPerLot, profitPerLot }: { noticeId: string; maxLots: number; costPerLot: number; profitPerLot: number }) {
  const [s, action] = useActionState(placeBid, initialState)
  const [lots, setLots] = useState(1)
  if (s.ok) return <FormAlert message={s.message} />
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="bidNoticeId" value={noticeId} />
      <FormAlert error={s.error} />
      <Field label="Number of lots" name="numberOfLots" type="number" min={1} max={maxLots} required value={lots} onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))} error={s.fieldErrors?.numberOfLots} />
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted">You pay</dt><dd className="text-right font-semibold">{naira(lots * costPerLot)}</dd>
        <dt className="text-muted">Expected profit</dt><dd className="text-right font-semibold text-ok">{naira(lots * profitPerLot)}</dd>
      </dl>
      <TextArea label="Message" name="message" optional rows={2} />
      <SubmitButton className="btn btn-primary" pendingText="Placing bid…">Place bid</SubmitButton>
    </form>
  )
}
