import 'server-only'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'

/**
 * File storage.
 *
 * On Vercel the filesystem is read-only, so uploads go to Vercel Blob
 * (set BLOB_READ_WRITE_TOKEN — Vercel adds it when you connect a Blob store).
 * Records then hold the full https:// URL.
 *
 * Without a token (local development) files are written to UPLOAD_DIR,
 * defaulting to the Express app's public/uploads when it sits next door, and
 * served back by app/uploads/[...path]/route.ts as /uploads/<dir>/<name>,
 * exactly like before.
 */
export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR ||
    (fs.existsSync(path.join(process.cwd(), '..', 'public', 'uploads'))
      ? path.join(process.cwd(), '..', 'public', 'uploads')
      : path.join(process.cwd(), 'uploads')),
)

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN

const RULES = {
  image: { ext: /\.(jpe?g|png|gif|webp)$/i, mime: /^image\/(jpeg|png|gif|webp)$/, label: 'JPG, PNG, GIF or WebP images' },
  document: {
    ext: /\.(jpe?g|png|gif|webp|pdf|docx?)$/i,
    mime: /^(image\/(jpeg|png|gif|webp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
    label: 'images, PDF or Word documents',
  },
} as const

export class UploadError extends Error {}

/**
 * Files arrive either as File objects (local development, small forms) or,
 * on Vercel, as `blob:{json}` references: the browser uploads straight to the
 * Blob store first (lib/upload-client.ts) because serverless requests are
 * capped at 4.5MB. Both shapes go through the same checks below.
 */
export type UploadInput = File | string
type BlobRef = { url: string; name: string; type: string; size: number }

function parseRef(v: string): BlobRef | null {
  if (!v.startsWith('blob:')) return null
  try {
    const r = JSON.parse(v.slice(5))
    if (typeof r?.url !== 'string') return null
    const u = new URL(r.url)
    if (u.protocol !== 'https:' || !u.hostname.endsWith('.public.blob.vercel-storage.com') || !u.pathname.startsWith('/uploads/')) return null
    // Only accept files from this project's own store
    const store = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(process.env.BLOB_READ_WRITE_TOKEN || '')?.[1]
    if (store && !u.hostname.startsWith(store.toLowerCase() + '.')) return null
    return { url: r.url, name: String(r.name || u.pathname.split('/').pop()), type: String(r.type || ''), size: Number(r.size) || 0 }
  } catch {
    return null
  }
}

export function hasFile(v: FormDataEntryValue | null): v is UploadInput {
  if (typeof v === 'string') return !!parseRef(v)
  return typeof v === 'object' && v !== null && 'size' in v && (v as File).size > 0
}

function meta(file: UploadInput) {
  if (typeof file === 'string') {
    const r = parseRef(file)
    if (!r) throw new UploadError('A file didn’t upload properly. Please choose it again.')
    return r
  }
  return { url: '', name: file.name, type: file.type, size: file.size }
}

export function fileName(file: UploadInput) {
  return meta(file).name
}

export function validateFile(input: UploadInput, kind: keyof typeof RULES, maxMb: number, label: string) {
  const rule = RULES[kind]
  const file = meta(input)
  if (!rule.ext.test(file.name) || !rule.mime.test(file.type)) {
    throw new UploadError(`${label}: only ${rule.label} are accepted.`)
  }
  if (file.size > maxMb * 1024 * 1024) throw new UploadError(`${label} must be ${maxMb}MB or smaller.`)
}

/**
 * Save a file using the same folders and naming the multer config used.
 * Returns the URL to store on the record and the filename.
 */
export async function saveUpload(input: UploadInput, dir: string, prefix: string) {
  if (typeof input === 'string') {
    // Already in the Blob store
    const r = meta(input)
    return { url: r.url, filename: r.url.split('/').pop() as string }
  }
  const file = input
  const ext = path.extname(file.name).toLowerCase()
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`

  if (useBlob()) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`uploads/${dir}/${filename}`, file, {
      access: 'public',
      contentType: file.type || undefined,
      // Receipts and certificates shouldn't be guessable
      addRandomSuffix: true,
    })
    return { url: blob.url, filename }
  }

  if (process.env.VERCEL) {
    throw new UploadError('File uploads aren’t set up yet. Connect a Vercel Blob store to this project, then redeploy.')
  }
  const folder = path.join(UPLOAD_ROOT, dir)
  await fsp.mkdir(folder, { recursive: true })
  await fsp.writeFile(path.join(folder, filename), Buffer.from(await file.arrayBuffer()))
  return { url: `/uploads/${dir}/${filename}`, filename }
}

/** Delete a stored file (Blob URL or local /uploads path). Failures are ignored. */
export async function removeUpload(url?: string | null) {
  if (!url) return
  try {
    if (/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url)) {
      if (!useBlob()) return
      const { del } = await import('@vercel/blob')
      await del(url)
      return
    }
    if (url.startsWith('/uploads/')) {
      const rel = path.normalize(url.slice('/uploads/'.length))
      if (rel.startsWith('..')) return
      const file = path.join(UPLOAD_ROOT, rel)
      if (file.startsWith(UPLOAD_ROOT) && !process.env.VERCEL) await fsp.unlink(file)
    }
  } catch {}
}
