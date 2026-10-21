'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'

type Notice = { type: 'success' | 'error' | 'info'; text: string }

function readNotice(): Notice | null {
  const m = document.cookie.match(/(?:^|; )rv_notice=([^;]+)/)
  if (!m) return null
  document.cookie = 'rv_notice=; Max-Age=0; path=/'
  try {
    return JSON.parse(decodeURIComponent(decodeURIComponent(m[1])))
  } catch {
    return null
  }
}

/** Show a toast from client code. */
export function toast(type: Notice['type'], text: string) {
  window.dispatchEvent(new CustomEvent<Notice>('rv-notice', { detail: { type, text } }))
}

/** Shows a one-shot message set by a server action (see lib/notice.ts). */
export function NoticeToast({ initial = [] }: { initial?: Notice[] }) {
  const [items, setItems] = useState<Notice[]>(initial)

  const pathname = usePathname()
  const search = useSearchParams()
  // Re-check after every navigation: server actions redirect client-side
  useEffect(() => {
    const n = readNotice()
    if (n) setItems([n]) // newest message replaces any still showing
  }, [pathname, search])

  // In-page actions (admin buttons) announce results without navigating
  useEffect(() => {
    const on = (e: Event) => setItems([(e as CustomEvent<Notice>).detail])
    window.addEventListener('rv-notice', on)
    return () => window.removeEventListener('rv-notice', on)
  }, [])

  useEffect(() => {
    if (!items.length) return
    const t = setTimeout(() => setItems((prev) => prev.slice(1)), 9000)
    return () => clearTimeout(t)
  }, [items])

  if (!items.length) return null
  const n = items[0]
  const Icon = n.type === 'success' ? CheckCircle2 : n.type === 'error' ? AlertCircle : Info
  const tone =
    n.type === 'success' ? 'text-ok' : n.type === 'error' ? 'text-danger' : 'text-teal-ink'
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4">
      <div
        role={n.type === 'error' ? 'alert' : 'status'}
        className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-[14px] border border-line bg-white p-4 shadow-[0_12px_40px_-12px_rgb(15_59_59/.35)] [animation:rv-toast_.35s_var(--ease-out-soft)]"
      >
        <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} />
        <p className="flex-1 text-[0.95rem] leading-snug text-ink">{n.text}</p>
        <button onClick={() => setItems((p) => p.slice(1))} className="-m-1 rounded p-1 text-muted hover:text-ink" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
