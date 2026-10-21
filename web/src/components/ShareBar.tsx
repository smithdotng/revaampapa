'use client'
import { useState } from 'react'
import { Check, Copy, MessageCircle } from 'lucide-react'

export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const text = encodeURIComponent(`${title} — ${url}`)
  const btn = 'inline-flex min-h-10 items-center gap-2 rounded-full border border-line-2 bg-white px-3.5 text-sm font-medium text-ink hover:border-ink'
  return (
    <div className="flex flex-wrap gap-2">
      <a className={btn} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className={btn} href={`https://twitter.com/intent/tweet?text=${text}`} target="_blank" rel="noopener noreferrer">X</a>
      <button type="button" className={btn} onClick={async () => {
        try {
          if (navigator.share && /Mobi/.test(navigator.userAgent)) { await navigator.share({ title, url }); return }
          await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
        } catch {}
      }}>
        {copied ? <Check className="size-4 text-ok" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  )
}
