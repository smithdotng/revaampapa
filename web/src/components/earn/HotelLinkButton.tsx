'use client'
import { useState, useTransition } from 'react'
import { Link2, LoaderCircle } from 'lucide-react'
import { getHotelLink } from '@/actions/earn'
import { CopyLink } from '@/components/dash/client'

export function HotelLinkButton({ hotelId, existing, message, compact }: { hotelId: string; existing?: string; message: string; compact?: boolean }) {
  const [url, setUrl] = useState(existing)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  if (url) return <CopyLink compact={compact} url={url} message={message} track={{ hotelId, linkType: 'hotel' }} />
  return (
    <div>
      <button type="button" disabled={pending} className="btn btn-ghost w-full"
        onClick={() => start(async () => { const r = await getHotelLink(hotelId); if ('url' in r && r.url) setUrl(r.url); else setError(r.error || 'Couldn’t create the link.') })}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Link2 className="size-4" aria-hidden />} {pending ? 'Creating…' : 'Get my hotel link'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
