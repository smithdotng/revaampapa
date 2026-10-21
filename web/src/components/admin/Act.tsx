'use client'
import { useId, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { toast } from '@/components/NoticeToast'
import type { AdminResult } from '@/actions/admin'

export type AskField = {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'select' | 'number' | 'date'
  placeholder?: string
  required?: boolean
  options?: [string, string][]
  defaultValue?: string
}

const STYLES = {
  primary: 'btn btn-primary min-h-10 px-4 text-sm',
  ok: 'btn min-h-10 bg-ok px-4 text-sm text-white hover:brightness-110',
  ghost: 'btn btn-ghost min-h-10 px-4 text-sm',
  danger: 'btn btn-ghost min-h-10 px-4 text-sm text-danger hover:border-danger',
  link: 'inline-flex min-h-9 items-center text-sm font-semibold text-teal-ink hover:text-ink',
} as const

/**
 * One admin action button. Without `ask` it runs immediately (or after one
 * inline confirmation with `confirm`). With `ask` it opens a small inline form
 * for a reason, reference or note before running. The result shows as a toast
 * and the page refreshes in place.
 */
export function Act({
  action, id, extra, label, variant = 'ghost', ask, confirm, submitLabel, icon,
}: {
  action: (fd: FormData) => Promise<AdminResult>
  id?: string
  extra?: Record<string, string>
  label: ReactNode
  variant?: keyof typeof STYLES
  ask?: AskField[]
  confirm?: string
  submitLabel?: string
  icon?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()
  const uid = useId()

  const run = (fd: FormData) => {
    if (id) fd.set('id', id)
    for (const [k, v] of Object.entries(extra || {})) fd.set(k, v)
    start(async () => {
      try {
        const r = await action(fd)
        if (r?.error) return toast('error', r.error)
        if (r?.message) toast('success', r.message)
        setOpen(false)
        router.refresh()
      } catch (err) {
        // redirect() inside an action surfaces here as a navigation; let Next handle it
        if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: string }).digest).startsWith('NEXT_REDIRECT')) throw err
        toast('error', 'That didn’t work. Refresh the page and try again.')
      }
    })
  }

  const spinner = <LoaderCircle className="size-4 animate-spin" aria-hidden />

  if ((ask?.length || confirm) && open) {
    return (
      <form
        className="grid w-full min-w-[min(100%,280px)] gap-3 rounded-[var(--radius-md)] border border-line-2 bg-paper p-3"
        onSubmit={(e) => { e.preventDefault(); run(new FormData(e.currentTarget)) }}
      >
        {confirm && <p className="text-sm text-ink-2">{confirm}</p>}
        {ask?.map((f) => {
          const fid = `${uid}-${f.name}`
          return (
            <div key={f.name}>
              <label htmlFor={fid} className="mb-1 block text-xs font-semibold text-ink-2">{f.label}{!f.required && <span className="font-normal text-muted"> (optional)</span>}</label>
              {f.type === 'textarea' ? (
                <textarea id={fid} name={f.name} rows={3} required={f.required} placeholder={f.placeholder} defaultValue={f.defaultValue} className="input min-h-0 bg-white py-2 text-sm" autoFocus />
              ) : f.type === 'select' ? (
                <select id={fid} name={f.name} required={f.required} defaultValue={f.defaultValue} className="input min-h-10 bg-white py-1.5 text-sm">
                  {f.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input id={fid} name={f.name} type={f.type || 'text'} required={f.required} placeholder={f.placeholder} defaultValue={f.defaultValue} className="input min-h-10 bg-white py-1.5 text-sm" />
              )}
            </div>
          )
        })}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={variant === 'danger' ? 'btn min-h-10 bg-danger px-4 text-sm text-white hover:bg-[#8f1c13]' : variant === 'ok' ? STYLES.ok : STYLES.primary}>
            {pending ? <>{spinner} Working…</> : submitLabel || label}
          </button>
          <button type="button" className={STYLES.ghost} onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      className={STYLES[variant]}
      onClick={() => (ask?.length || confirm ? setOpen(true) : run(new FormData()))}
    >
      {pending ? spinner : icon}
      {label}
    </button>
  )
}
