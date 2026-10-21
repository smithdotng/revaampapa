'use client'
import { cancelReservation } from '@/actions/pro'
import { ConfirmAction } from '@/components/dash/client'

export function CancelButton({ id }: { id: string }) {
  return <ConfirmAction action={() => cancelReservation(id)} label="Cancel this stay" confirmLabel="Yes, cancel it" pendingLabel="Cancelling…" note="Cancelled stays don’t earn cashback." />
}
