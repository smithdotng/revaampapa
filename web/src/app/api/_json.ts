import 'server-only'
import type { FormState } from '@/lib/form'

/** Old JSON endpoints accepted form posts and JSON alike. */
export async function bodyAsFormData(req: Request) {
  const type = req.headers.get('content-type') || ''
  if (type.includes('application/json')) {
    const fd = new FormData()
    try {
      const j = await req.json()
      for (const [k, v] of Object.entries(j || {})) if (v !== undefined && v !== null) fd.set(k, String(v))
    } catch {}
    return fd
  }
  try { return await req.formData() } catch { return new FormData() }
}

export function fromState(s: FormState) {
  const ok = !!s.ok
  const message = s.message || s.error || (s.fieldErrors ? Object.values(s.fieldErrors)[0] : '') || (ok ? 'Done' : 'Something went wrong')
  return Response.json({ success: ok, message, errors: s.fieldErrors }, { status: ok ? 200 : 400 })
}
