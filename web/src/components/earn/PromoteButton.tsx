'use client'
import { useState, useTransition } from 'react'
import { Link2, LoaderCircle } from 'lucide-react'
import { getPropertyLink } from '@/actions/earn'
import { CopyLink } from '@/components/dash/client'

export function PromoteButton({ propertyId, existing, message }: { propertyId: string; existing?: string; message: string }) {
  const [url, setUrl] = useState(existing)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  if (url) return <CopyLink url={url} message={message} track={{ propertyId, linkType: 'property' }} />
  return (
    <div>
      <button type="button" disabled={pending} className="btn btn-primary w-full"
        onClick={() => start(async () => {
          const r = await getPropertyLink(propertyId)
          if ('url' in r && r.url) setUrl(r.url); else setError(r.error || 'Couldn’t create the link.')
        })}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        {pending ? 'Creating your link…' : 'Get my link'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
