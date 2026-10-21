'use client'
import { useState, type ReactNode, type InputHTMLAttributes } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, LoaderCircle, AlertCircle, CheckCircle2, Upload, FileText } from 'lucide-react'

export function SubmitButton({ children, pendingText = 'Sending…', className = 'btn btn-primary w-full', pending: forced }: { children: ReactNode; pendingText?: string; className?: string; pending?: boolean }) {
  const status = useFormStatus()
  const pending = forced || status.pending
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? (<><LoaderCircle className="size-4 animate-spin" aria-hidden /> {pendingText}</>) : children}
    </button>
  )
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null
  const bad = !!error
  return (
    <div role={bad ? 'alert' : 'status'} className={`flex gap-3 rounded-[var(--radius-sm)] p-4 text-[0.95rem] ${bad ? 'bg-danger-soft text-danger' : 'bg-ok-soft text-ok'}`}>
      {bad ? <AlertCircle className="mt-0.5 size-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0" />}
      <p>{error || message}</p>
    </div>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  hint?: ReactNode
  error?: string
  optional?: boolean
}

export function Field({ label, name, hint, error, optional, id, className = '', ...rest }: FieldProps) {
  const fid = id || `f-${name}`
  return (
    <div className={className}>
      <label htmlFor={fid} className="field-label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      <input id={fid} name={name} className="input" aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${fid}-d` : undefined} {...rest} />
      {(error || hint) && <p id={`${fid}-d`} className={`field-hint ${error ? '!text-danger' : ''}`}>{error || hint}</p>}
    </div>
  )
}

export function TextArea({ label, name, hint, error, optional, rows = 5, defaultValue, required, placeholder, maxLength }: {
  label: string; name: string; hint?: ReactNode; error?: string; optional?: boolean; rows?: number; defaultValue?: string; required?: boolean; placeholder?: string; maxLength?: number
}) {
  const fid = `f-${name}`
  return (
    <div>
      <label htmlFor={fid} className="field-label">{label} {optional && <span className="font-normal text-muted">(optional)</span>}</label>
      <textarea id={fid} name={name} rows={rows} className="input" defaultValue={defaultValue} required={required} placeholder={placeholder} maxLength={maxLength} aria-invalid={error ? true : undefined} />
      {(error || hint) && <p className={`field-hint ${error ? '!text-danger' : ''}`}>{error || hint}</p>}
    </div>
  )
}

export function Select({ label, name, options, hint, error, optional, defaultValue, required, placeholder }: {
  label: string; name: string; options: (string | [string, string])[]; hint?: ReactNode; error?: string; optional?: boolean; defaultValue?: string; required?: boolean; placeholder?: string
}) {
  const fid = `f-${name}`
  return (
    <div>
      <label htmlFor={fid} className="field-label">{label} {optional && <span className="font-normal text-muted">(optional)</span>}</label>
      <select id={fid} name={name} className="input" defaultValue={defaultValue ?? ''} required={required} aria-invalid={error ? true : undefined}>
        <option value="" disabled={required}>{placeholder || 'Select…'}</option>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o]
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
      {(error || hint) && <p className={`field-hint ${error ? '!text-danger' : ''}`}>{error || hint}</p>}
    </div>
  )
}

/** Password with show/hide and a live length check. */
export function PasswordFields({ confirm = true, error, autoComplete = 'new-password', label = 'Password' }: { confirm?: boolean; error?: string; autoComplete?: string; label?: string }) {
  const [show, setShow] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const mismatch = confirm && pw2.length > 0 && pw !== pw2
  const toggle = (
    <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  )
  return (
    <div className={confirm ? 'grid gap-5 sm:grid-cols-2' : ''}>
      <div>
        <label htmlFor="f-password" className="field-label">{label}</label>
        <div className="relative">
          <input id="f-password" name="password" type={show ? 'text' : 'password'} required minLength={confirm ? 8 : undefined} autoComplete={autoComplete} className="input pr-12" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={error ? true : undefined} />
          {toggle}
        </div>
        {confirm && (
          <p className={`field-hint ${pw.length > 0 && pw.length < 8 ? '!text-danger' : ''}`}>
            {pw.length >= 8 ? 'Good length.' : 'At least 8 characters.'}
          </p>
        )}
        {error && <p className="field-hint !text-danger">{error}</p>}
      </div>
      {confirm && (
        <div>
          <label htmlFor="f-confirm" className="field-label">Confirm password</label>
          <input id="f-confirm" name="confirmPassword" type={show ? 'text' : 'password'} required autoComplete="new-password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-invalid={mismatch || undefined} />
          {mismatch && <p className="field-hint !text-danger">Passwords don’t match yet.</p>}
        </div>
      )}
    </div>
  )
}

export function FileField({ label, name, accept, hint, optional, multiple, required }: {
  label: string; name: string; accept: string; hint?: string; optional?: boolean; multiple?: boolean; required?: boolean
}) {
  const [files, setFiles] = useState<string[]>([])
  const fid = `f-${name}`
  return (
    <div>
      <span className="field-label">{label} {optional && <span className="font-normal text-muted">(optional)</span>}</span>
      <label htmlFor={fid} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-dashed border-line-2 bg-white px-4 py-3.5 transition-colors hover:border-teal focus-within:border-teal focus-within:ring-[3px] focus-within:ring-teal/15">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-teal-ink">
          {files.length ? <FileText className="size-5" /> : <Upload className="size-5" />}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          {files.length ? (
            <span className="block truncate font-medium text-ink">{files.length > 1 ? `${files.length} files selected` : files[0]}</span>
          ) : (
            <span className="font-medium text-ink">Choose {multiple ? 'files' : 'a file'}</span>
          )}
          <span className="block text-muted">{hint}</span>
        </span>
        <input id={fid} name={name} type="file" accept={accept} multiple={multiple} required={required} className="sr-only"
          onChange={(e) => setFiles(Array.from(e.target.files || []).map((f) => f.name))} />
      </label>
    </div>
  )
}

export function Checkbox({ name, children, required, defaultChecked, value }: { name: string; children: ReactNode; required?: boolean; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] text-ink-2">
      <input type="checkbox" name={name} value={value} required={required} defaultChecked={defaultChecked} className="mt-1 size-[18px] shrink-0 accent-[var(--color-lagoon)]" />
      <span>{children}</span>
    </label>
  )
}
