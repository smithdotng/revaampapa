import path from 'node:path'
import fs from 'node:fs/promises'
import { UPLOAD_ROOT } from '@/lib/uploads'

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
}

/**
 * Serves /uploads/... paths held by older records.
 * 1. From UPLOAD_DIR when the file is on this machine (local development).
 * 2. Otherwise redirects to NEXT_PUBLIC_UPLOADS_URL — the Blob store the files were
 *    copied to, or the old server while it's still up.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path
  const rel = path.normalize(parts.join('/'))
  if (rel.startsWith('..') || path.isAbsolute(rel)) return new Response('Not found', { status: 404 })

  if (!process.env.VERCEL) {
    const candidates = [path.join(UPLOAD_ROOT, rel)]
    // Hotel images uploaded before a multer fix were saved under properties/
    if (parts[0] === 'hotels') candidates.push(path.join(UPLOAD_ROOT, 'properties', ...parts.slice(1)))
    for (const file of candidates) {
      if (!file.startsWith(UPLOAD_ROOT)) continue
      try {
        const data = await fs.readFile(file)
        const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
        const headers: Record<string, string> = {
          'Content-Type': type,
          'Cache-Control': 'public, max-age=604800',
          'X-Content-Type-Options': 'nosniff',
        }
        // Documents (bar certificates, payment receipts) shouldn't render inline
        if (rel.startsWith('documents/') || rel.startsWith('payments/')) headers['Content-Disposition'] = 'attachment'
        return new Response(new Uint8Array(data), { headers })
      } catch {}
    }
  }

  const base = process.env.NEXT_PUBLIC_UPLOADS_URL
  if (base) {
    const target = `${base.replace(/\/$/, '')}/uploads/${parts.map(encodeURIComponent).join('/')}`
    return Response.redirect(target, 308)
  }
  return new Response('Not found', { status: 404 })
}
