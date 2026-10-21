'use client'
import { useActionState, useEffect, useState, type FormEvent } from 'react'
import { ImagePlus, X, Star } from 'lucide-react'
import { saveProperty } from '@/actions/owner'
import { initialState, type FormState } from '@/lib/form'
import { NIGERIAN_STATES, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'
import { Field, Select, Checkbox, SubmitButton, FormAlert } from '@/components/forms'
import { RichText } from './RichText'
import { submitWithUploads } from '@/lib/upload-client'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Existing = { url: string; isPrimary?: boolean }

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-7 lg:grid-cols-[220px_1fr] lg:gap-10">
      <div><h2 className="font-sans text-[1.05rem] font-semibold tracking-normal">{title}</h2>{hint && <p className="mt-1 text-sm text-muted">{hint}</p>}</div>
      <div className="grid content-start gap-5">{children}</div>
    </section>
  )
}

type SaveAction = (prev: FormState, fd: FormData) => Promise<FormState>

/**
 * Listing form shared by property owners and the superadmin.
 * `admin` adds the owner-on-whose-behalf section and the review/status controls.
 */
export function PropertyForm({ property, action = saveProperty, admin = false }: { property?: any; action?: SaveAction; admin?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initialState)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const existing: Existing[] = property?.images || []
  const v = state.values || {}
  const e = state.fieldErrors || {}
  const p = property || {}
  const f = p.features || {}
  const l = p.location || {}
  const val = (k: string, fallback: any) => (v[k] !== undefined ? v[k] : fallback ?? '')
  const states = NIGERIAN_STATES.includes(l.state) || !l.state ? NIGERIAN_STATES : [l.state, ...NIGERIAN_STATES]

  useEffect(() => {
    const urls = files.map((x) => URL.createObjectURL(x))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  // Submit with our own FormData so chosen photos survive a failed attempt
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    fd.delete('images')
    files.forEach((x) => fd.append('images', x))
    submitWithUploads(fd, formAction, setBusy)
  }

  const kept = existing.filter((i) => !removed.includes(i.url))

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {p._id && <input type="hidden" name="id" value={p._id} />}
      {removed.map((u) => <input key={u} type="hidden" name="removeImages" value={u} />)}
      <FormAlert error={state.error} />

      <Section title="The basics" hint="What buyers see first in search results.">
        <Field label="Listing title" name="title" required minLength={10} maxLength={120} defaultValue={val('title', p.title)} error={e.title} placeholder="e.g. 4-bedroom terrace duplex with BQ, Jabi" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Property type" name="propertyType" required options={Object.entries(PROPERTY_TYPES)} defaultValue={val('propertyType', p.propertyType)} error={e.propertyType} />
          <Select label="Deal" name="transactionType" required options={Object.entries(TRANSACTION_TYPES)} defaultValue={val('transactionType', p.transactionType)} error={e.transactionType} />
          <Field label="Price (₦)" name="price" type="number" min={1} step="any" inputMode="numeric" required defaultValue={val('price', p.price)} error={e.price} hint="Per year for rent, per night for shortlets." />
          <div className="flex items-end pb-3"><Checkbox name="priceNegotiable" defaultChecked={v.priceNegotiable ? v.priceNegotiable === 'on' : !!p.priceNegotiable}>Price is negotiable</Checkbox></div>
        </div>
      </Section>

      <Section title="Photos" hint="The first photo is the cover. Clear, well-lit photos get more enquiries. Up to 15, 10MB each.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kept.map((img, i) => (
            <li key={img.url} className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-mist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold"><Star className="size-3 fill-roof text-roof" /> Cover</span>}
              <button type="button" onClick={() => setRemoved((r) => [...r, img.url])} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/95 text-ink shadow hover:text-danger" aria-label="Remove photo"><X className="size-4" /></button>
            </li>
          ))}
          {previews.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-mist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              {kept.length === 0 && i === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold"><Star className="size-3 fill-roof text-roof" /> Cover</span>}
              <span className="absolute bottom-2 left-2 rounded-full bg-lagoon px-2 py-0.5 text-xs font-semibold text-white">New</span>
              <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/95 text-ink shadow hover:text-danger" aria-label="Remove photo"><X className="size-4" /></button>
            </li>
          ))}
          <li>
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-line-2 bg-paper text-sm font-medium text-ink-2 hover:border-teal focus-within:border-teal">
              <ImagePlus className="size-6 text-teal-ink" aria-hidden />
              Add photos
              <input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                onChange={(ev) => { const list = Array.from(ev.target.files || []); setFiles((fs) => [...fs, ...list].slice(0, 15)); ev.target.value = '' }} />
            </label>
          </li>
        </ul>
        {e.images && <p className="field-hint !mt-0 !text-danger">{e.images}</p>}
      </Section>

      <Section title="Description" hint="Size, condition, documents available, access roads, what’s nearby.">
        <RichText name="description" label="Description" defaultValue={v.description ?? p.description ?? ''} error={e.description} />
        <Field label="Video tour link" name="videoUrl" type="url" optional placeholder="https://youtube.com/…" defaultValue={val('videoUrl', p.videoUrl)} />
      </Section>

      <Section title="Location">
        <Field label="Street address" name="address" optional defaultValue={val('address', l.address)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City / area" name="city" required defaultValue={val('city', l.city)} error={e.city} />
          <Select label="State" name="state" required options={states} defaultValue={val('state', l.state)} error={e.state} />
          <Field label="LGA" name="lga" optional defaultValue={val('lga', l.lga)} />
          <Field label="Nearest landmark" name="landmark" optional defaultValue={val('landmark', l.landmark)} />
        </div>
      </Section>

      <Section title="Features" hint="Leave blank what doesn’t apply.">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Field label="Bedrooms" name="bedrooms" type="number" min={0} optional defaultValue={val('bedrooms', f.bedrooms)} />
          <Field label="Bathrooms" name="bathrooms" type="number" min={0} optional defaultValue={val('bathrooms', f.bathrooms)} />
          <Field label="Toilets" name="toilets" type="number" min={0} optional defaultValue={val('toilets', f.toilets)} />
          <Field label="Parking spaces" name="parkingSpaces" type="number" min={0} optional defaultValue={val('parkingSpaces', f.parkingSpaces)} />
          <Field label="Floor area (m²)" name="floorArea" type="number" min={0} step="any" optional defaultValue={val('floorArea', f.floorArea)} />
          <Field label="Land area (m²)" name="landArea" type="number" min={0} step="any" optional defaultValue={val('landArea', f.landArea)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[['furnished', 'Furnished'], ['serviced', 'Serviced'], ['security', '24-hour security'], ['powerSupply', 'Steady power'], ['borehole', 'Borehole']].map(([k, label]) => (
            <Checkbox key={k} name={k} defaultChecked={v[k] ? v[k] === 'on' : !!f[k]}>{label}</Checkbox>
          ))}
        </div>
      </Section>

      {admin && (!p._id || p.listedBySuperadmin) && (
        <Section title="Owner" hint="Listing for someone without an account. Enquiries about this property come to the Revaamp team.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Owner’s name" name="ownerName" required defaultValue={val('ownerName', p.externalOwner?.name)} error={e.ownerName} />
            <Field label="Owner’s phone" name="ownerPhone" type="tel" required defaultValue={val('ownerPhone', p.externalOwner?.phone)} error={e.ownerPhone} />
            <Field label="Owner’s email" name="ownerEmail" type="email" optional defaultValue={val('ownerEmail', p.externalOwner?.email)} error={e.ownerEmail} />
            <Field label="Owner’s address" name="ownerAddress" optional defaultValue={val('ownerAddress', p.externalOwner?.address)} />
          </div>
        </Section>
      )}

      {admin && p._id && (
        <Section title="Review and visibility" hint="Changing these here skips the owner emails. Use Verify or Send back on the listing page to notify them.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Review status" name="verificationStatus" options={[['pending_payment', 'Awaiting fee'], ['payment_confirmed', 'Fee submitted — to review'], ['verified', 'Verified'], ['rejected', 'Sent back']]} defaultValue={val('verificationStatus', p.verificationStatus)} />
            <Select label="Availability" name="status" options={[['pending_payment', 'Awaiting fee'], ['payment_confirmed', 'Under review'], ['available', 'Available'], ['sold', 'Sold'], ['rented', 'Rented'], ['unavailable', 'Unavailable'], ['rejected', 'Rejected']]} defaultValue={val('status', p.status)} />
          </div>
          <Checkbox name="featured" defaultChecked={v.featured ? v.featured === 'on' : !!p.featured}>Feature on the home page</Checkbox>
        </Section>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border sm:bg-white sm:px-6">
        <p className="text-sm text-muted">{admin ? (p._id ? 'Saved changes go live straight away.' : 'Listings you add are verified and live straight away.') : p._id ? 'Edits to a listing under review are checked again before it goes live.' : 'Next: pay the ₦20,000 verification fee to send it for review.'}</p>
        <SubmitButton className="btn btn-primary" pending={pending || busy} pendingText={busy ? 'Uploading photos…' : 'Saving…'}>{p._id ? 'Save changes' : admin ? 'Publish listing' : 'Save and continue'}</SubmitButton>
      </div>
    </form>
  )
}
