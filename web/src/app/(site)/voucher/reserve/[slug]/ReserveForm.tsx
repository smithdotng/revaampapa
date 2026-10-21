'use client'
import { useActionState, useMemo, useState } from 'react'
import { reserveStay } from '@/actions/voucher'
import { initialState } from '@/lib/form'
import { naira } from '@/lib/format'
import { Field, TextArea, SubmitButton, FormAlert } from '@/components/forms'

export function ReserveForm({ slug, rate, defaults }: { slug: string; rate: number; defaults: { name: string; email: string; phone: string } }) {
  const [state, action] = useActionState(reserveStay, initialState)
  const v = state.values || {}
  const e = state.fieldErrors || {}
  const today = new Date().toISOString().slice(0, 10)
  const [inD, setIn] = useState(v.checkInDate || '')
  const [outD, setOut] = useState(v.checkOutDate || '')
  const [roomRate, setRate] = useState(v.roomRate || '')
  const [rooms, setRooms] = useState(v.numberOfRooms || '1')

  const est = useMemo(() => {
    const nights = inD && outD ? Math.round((+new Date(outD) - +new Date(inD)) / 86400000) : 0
    const total = (parseFloat(roomRate) || 0) * (parseInt(rooms) || 1) * Math.max(0, nights)
    return { nights: Math.max(0, nights), total, cashback: Math.round(total * rate) / 100 }
  }, [inD, outD, roomRate, rooms, rate])

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="slug" value={slug} />
      <FormAlert error={state.error} />
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="t-3 mb-4">Your stay</legend>
        <Field label="Check-in" name="checkInDate" type="date" min={today} required value={inD} onChange={(x) => setIn(x.target.value)} error={e.checkInDate} />
        <Field label="Check-out" name="checkOutDate" type="date" min={inD || today} required value={outD} onChange={(x) => setOut(x.target.value)} error={e.checkOutDate} />
        <Field label="Room type" name="roomType" optional defaultValue={v.roomType} placeholder="e.g. Deluxe double" />
        <Field label="Nightly rate (₦)" name="roomRate" type="number" min={0} step="any" inputMode="decimal" optional value={roomRate} onChange={(x) => setRate(x.target.value)} hint="As quoted by the hotel. Used to estimate your cashback." />
        <Field label="Rooms" name="numberOfRooms" type="number" min={1} value={rooms} onChange={(x) => setRooms(x.target.value)} />
        <Field label="Guests" name="numberOfGuests" type="number" min={1} defaultValue={v.numberOfGuests || '1'} />
      </fieldset>
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="t-3 mb-4">Guest details</legend>
        <Field label="Name on the booking" name="guestName" required defaultValue={v.guestName ?? defaults.name} error={e.guestName} className="sm:col-span-2" />
        <Field label="Email" name="guestEmail" type="email" defaultValue={v.guestEmail ?? defaults.email} error={e.guestEmail} />
        <Field label="Phone" name="guestPhone" type="tel" defaultValue={v.guestPhone ?? defaults.phone} />
      </fieldset>
      <TextArea label="Anything we should know?" name="specialRequests" optional rows={3} defaultValue={v.specialRequests} />

      <div className="rounded-[var(--radius-md)] bg-mist p-5" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-ink-2">{est.nights ? `${est.nights} night${est.nights > 1 ? 's' : ''}` : 'Choose your dates'}{est.total ? ` · ${naira(est.total)} estimated` : ''}</p>
          <p><span className="text-sm text-muted">Estimated cashback </span><span className="font-display text-2xl font-semibold text-lagoon">{naira(est.cashback)}</span></p>
        </div>
        <p className="mt-2 text-sm text-muted">Final cashback is worked out from the confirmed stay and paid after check-out.</p>
      </div>
      <SubmitButton pendingText="Registering…">Register this stay</SubmitButton>
    </form>
  )
}
