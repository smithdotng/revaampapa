'use client'
import { startTransition } from 'react'
import { upload } from '@vercel/blob/client'
import { toast } from '@/components/NoticeToast'

let mode: Promise<boolean> | null = null

/** True when the deployment has a Blob store (Vercel); false in local development. */
function directUploads() {
  mode ??= fetch('/api/uploads', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { direct: false }))
    .then((j) => !!j.direct)
    .catch(() => false)
  return mode
}

const slug = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 40) || 'file'

/**
 * Send any files in the form straight to the Blob store and swap each one for
 * a `blob:{json}` reference the server action understands. Without a Blob
 * store the FormData is returned unchanged and the files go with the request.
 */
export async function stageUploads(fd: FormData): Promise<FormData> {
  const entries = [...fd.entries()]
  const hasFiles = entries.some(([, v]) => typeof v !== 'string' && v.size > 0)
  if (!hasFiles || !(await directUploads())) return fd

  const staged = await Promise.all(entries.map(async ([key, v]) => {
    if (typeof v === 'string') return [key, v] as const
    if (v.size === 0) return null
    const ext = (/\.[a-z0-9]{1,5}$/i.exec(v.name)?.[0] || '').toLowerCase()
    const dir = slug(key)
    const blob = await upload(`uploads/${dir}/${dir}-${Date.now()}${ext}`, v, {
      access: 'public',
      handleUploadUrl: '/api/uploads',
      contentType: v.type || undefined,
      multipart: v.size > 8 * 1024 * 1024,
    })
    return [key, 'blob:' + JSON.stringify({ url: blob.url, name: v.name, type: v.type, size: v.size })] as const
  }))

  const out = new FormData()
  for (const e of staged) if (e) out.append(e[0], e[1])
  return out
}

/**
 * Submit a form to a server action after uploading its files.
 * `setBusy` covers the upload phase, before the action's own pending state starts.
 */
export function submitWithUploads(fd: FormData, action: (fd: FormData) => void, setBusy?: (b: boolean) => void) {
  setBusy?.(true)
  stageUploads(fd)
    .then((ready) => startTransition(() => action(ready)))
    .catch((err) => {
      console.error('[upload]', err)
      const msg = String((err as Error)?.message || '')
      toast('error', /content type|size|too large/i.test(msg)
        ? 'One of the files isn’t accepted. Use JPG, PNG or WebP photos, or PDF/Word documents, up to 15MB each.'
        : 'A file didn’t upload. Check your connection and try again.')
    })
    .finally(() => setBusy?.(false))
}
