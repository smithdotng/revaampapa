'use client'
import { useState, useTransition, type ReactNode } from 'react'
import { Check, Copy, MessageCircle, LoaderCircle } from 'lucide-react'
import { trackShare } from '@/actions/earn'

type Track = { linkType?: string; propertyId?: string; hotelId?: string; referralCode?: string }

/** A shareable link: copy, WhatsApp, Facebook, X — each share is recorded for Activity. */
export function CopyLink({ url, label, message, track, compact = false }: { url: string; label?: string; message?: string; track?: Track; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const log = (platform: string) => { if (track) void trackShare({ platform, link: url, ...track }).catch(() => {}) }
  const text = encodeURIComponent(`${message ? message + '\n\n' : ''}${url}`)
  const btn = 'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-2 bg-white px-3 text-sm font-medium text-ink hover:border-ink'
  return (
    <div className="grid gap-2">
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
      <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-paper p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-ink-2" title={url}>{url}</span>
        <button type="button" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-ink px-3 text-sm font-semibold text-white hover:bg-lagoon"
          onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); log('copy'); setTimeout(() => setCopied(false), 1800) } catch {} }}>
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <a className={btn} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" onClick={() => log('whatsapp')}><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>
          <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => log('facebook')}>Facebook</a>
          <a className={btn} href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noopener noreferrer" onClick={() => log('twitter')}>X</a>
          <a className={btn} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => log('linkedin')}>LinkedIn</a>
        </div>
      )}
    </div>
  )
}

/** A destructive action that asks once inline instead of a browser dialog. */
export function ConfirmAction({ action, label, confirmLabel, pendingLabel = 'Working…', className = '', note }: {
  action: () => Promise<unknown>; label: ReactNode; confirmLabel: string; pendingLabel?: string; className?: string; note?: string
}) {
  const [asking, setAsking] = useState(false)
  const [pending, start] = useTransition()
  if (!asking) return <button type="button" className={className || 'btn btn-ghost min-h-10 text-danger'} onClick={() => setAsking(true)}>{label}</button>
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {note && <span className="text-sm text-ink-2">{note}</span>}
      <button type="button" disabled={pending} className="btn min-h-10 bg-danger text-white hover:bg-[#8f1c13]" onClick={() => start(async () => { await action() })}>
        {pending ? <><LoaderCircle className="size-4 animate-spin" /> {pendingLabel}</> : confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost min-h-10" onClick={() => setAsking(false)} disabled={pending}>Keep it</button>
    </span>
  )
}
