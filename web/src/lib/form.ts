export type FormState = {
  ok?: boolean
  message?: string
  error?: string
  fieldErrors?: Record<string, string>
  values?: Record<string, string>
}

export const initialState: FormState = {}

/** Text values only — used to refill the form after a failed submit. */
export function formValues(fd: FormData, omit: string[] = ['password', 'confirmPassword']) {
  const out: Record<string, string> = {}
  for (const [k, v] of fd.entries()) {
    if (typeof v !== 'string' || omit.includes(k) || k.startsWith('$ACTION')) continue
    out[k] = out[k] ? `${out[k]},${v}` : v
  }
  return out
}

export function str(fd: FormData, key: string) {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export const NG_PHONE = /^(0|\+234)[7-9][0-1]\d{8}$/
export const INTL_PHONE = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
