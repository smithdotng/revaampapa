'use client'
import { useTransition } from 'react'
import { updateInterestStatus } from '@/actions/earn'

export function LeadStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition()
  return (
    <select aria-label="Lead status" defaultValue={status} disabled={pending}
      onChange={(e) => start(() => updateInterestStatus(id, e.target.value as 'new'))}
      className="input min-h-9 w-auto py-1 text-sm">
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="converted">Converted</option>
      <option value="closed">Closed</option>
    </select>
  )
}
