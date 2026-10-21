'use client'
import { useActionState, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ImagePlus, X, Star } from 'lucide-react'
import { saveHotel, saveBlog, saveBidNotice } from '@/actions/admin-forms'
import { initialState } from '@/lib/form'
import { AMENITIES, NIGERIAN_STATES } from '@/lib/format'
import { Field, TextArea, Select, Checkbox, SubmitButton, FormAlert } from '@/components/forms'
import { RichText } from '@/components/dash/RichText'
import { submitWithUploads } from '@/lib/upload-client'

/* eslint-disable @typescript-eslint/no-explicit-any */

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-7 lg:grid-cols-[220px_1fr] lg:gap-10">
      <div><h2 className="font-sans text-[1.05rem] font-semibold tracking-normal">{title}</h2>{hint && <p className="mt-1 text-sm text-muted">{hint}</p>}</div>
      <div className="grid content-start gap-5">{children}</div>
    </section>
  )
}

function SaveBar({ note, pending, label, pendingText = 'Saving…' }: { note: string; pending: boolean; label: string; pendingText?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-[var(--radius-lg)] sm:border sm:bg-white sm:px-6">
      <p className="text-sm text-muted">{note}</p>
      <SubmitButton className="btn btn-primary" pending={pending} pendingText={pendingText}>{label}</SubmitButton>
    </div>
  )
}

/** Existing photos (removable) plus newly chosen ones, held in state so they survive a failed save. */
function usePhotos(existing: { url: string; isPrimary?: boolean }[], max: number) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  useEffect(() => {
    const urls = files.map((x) => URL.createObjectURL(x))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])
  const kept = existing.filter((i) => !removed.includes(i.url))
  const picker = (
    <>
      {removed.map((u) => <input key={u} type="hidden" name="removeImages" value={u} />)}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kept.map((img, i) => (
          <li key={img.url} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-mist">
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
        {kept.length + files.length < max && (
          <li>
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-line-2 bg-paper text-sm font-medium text-ink-2 hover:border-teal focus-within:border-teal">
              <ImagePlus className="size-6 text-teal-ink" aria-hidden />
              Add photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                onChange={(ev) => { const list = Array.from(ev.target.files || []); setFiles((fs) => [...fs, ...list].slice(0, max - kept.length)); ev.target.value = '' }} />
            </label>
          </li>
        )}
      </ul>
    </>
  )
  return { files, picker }
}

/* ───────── Hotel ───────── */

export function HotelForm({ hotel }: { hotel?: any }) {
  const [state, formAction, pending] = useActionState(saveHotel, initialState)
  const [busy, setBusy] = useState(false)
  const h = hotel || {}
  const loc = h.location || {}
  const c = h.contactInfo || {}
  const v = state.values || {}
  const e = state.fieldErrors || {}
  const val = (k: string, fallback: any) => (v[k] !== undefined ? v[k] : fallback ?? '')
  const { files, picker } = usePhotos(h.images || [], 20)
  const amenities: string[] = v.amenities ? String(v.amenities).split(',') : h.amenities || []
  const states = NIGERIAN_STATES.includes(loc.state) || !loc.state ? NIGERIAN_STATES : [loc.state, ...NIGERIAN_STATES]

  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    files.forEach((x) => fd.append('images', x))
    submitWithUploads(fd, formAction, setBusy)
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {h._id && <input type="hidden" name="id" value={h._id} />}
      <FormAlert error={state.error} />
      <Section title="The hotel" hint="Shown on the public hotels page and to promoters.">
        <Field label="Hotel name" name="name" required defaultValue={val('name', h.name)} error={e.name} />
        <RichText name="description" label="Description" defaultValue={v.description ?? h.description ?? ''} error={e.description} hint="Rooms, location, what guests love." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Star rating (0–5)" name="rating" type="number" min={0} max={5} step="0.5" optional defaultValue={val('rating', h.rating)} />
        </div>
      </Section>

      <Section title="Photos" hint="The first photo is the cover. Remove any you no longer want; they go when you save.">
        {picker}
      </Section>

      <Section title="Location">
        <Field label="Street address" name="address" optional defaultValue={val('address', loc.address)} />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="City" name="city" required defaultValue={val('city', loc.city)} error={e.city} />
          <Select label="State" name="state" optional options={states} defaultValue={val('state', loc.state)} />
          <Field label="Country" name="country" optional defaultValue={val('country', loc.country || 'Nigeria')} />
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Phone" name="phone" type="tel" optional defaultValue={val('phone', c.phone)} />
          <Field label="Email" name="email" type="email" optional defaultValue={val('email', c.email)} />
          <Field label="Website" name="website" type="url" optional defaultValue={val('website', c.website)} placeholder="https://" />
        </div>
      </Section>

      <Section title="Amenities">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(AMENITIES).map(([k, label]) => <Checkbox key={k} name="amenities" value={k} defaultChecked={amenities.includes(k)}>{label}</Checkbox>)}
        </div>
      </Section>

      <Section title="Commission and visibility" hint="Promoters earn the commission on bookings they refer. Room Voucher subscribers get the voucher discount.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Promoter commission (%)" name="commissionRate" type="number" min={0} max={100} step="0.5" defaultValue={val('commissionRate', h.commissionRate ?? 30)} error={e.commissionRate} />
          <Field label="Room Voucher discount (%)" name="voucherDiscountRate" type="number" min={0} max={100} step="0.5" defaultValue={val('voucherDiscountRate', h.voucherDiscountRate ?? 0)} error={e.voucherDiscountRate} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox name="isActive" defaultChecked={v.isActive ? v.isActive === 'on' : h._id ? !!h.isActive : true}>Listed on the site</Checkbox>
          <Checkbox name="featured" defaultChecked={v.featured ? v.featured === 'on' : !!h.featured}>Featured</Checkbox>
        </div>
      </Section>

      <SaveBar note={h._id ? 'Changes go live straight away.' : 'The hotel appears on the site as soon as it’s saved and listed.'} pending={pending || busy} pendingText={busy ? 'Uploading photos…' : 'Saving…'} label={h._id ? 'Save changes' : 'Add hotel'} />
    </form>
  )
}

/* ───────── Blog post ───────── */

const BLOG_CATEGORIES = ['Market News', 'Buying Guide', 'Selling Tips', 'Renting Advice', 'Investment', 'Legal Guide', 'Agent Tips', 'Property Spotlight', 'Industry Insights']

export function BlogForm({ blog }: { blog?: any }) {
  const [state, formAction, pending] = useActionState(saveBlog, initialState)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string>('')
  const b = blog || {}
  const v = state.values || {}
  const e = state.fieldErrors || {}
  const val = (k: string, fallback: any) => (v[k] !== undefined ? v[k] : fallback ?? '')
  const cats: string[] = v.categories ? String(v.categories).split(',') : b.categories || []

  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    submitWithUploads(new FormData(ev.currentTarget), formAction, setBusy)
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {b._id && <input type="hidden" name="id" value={b._id} />}
      <FormAlert error={state.error} />
      <Section title="The post">
        <Field label="Title" name="title" required defaultValue={val('title', b.title)} error={e.title} />
        <TextArea label="Summary" name="excerpt" rows={3} required maxLength={300} defaultValue={val('excerpt', b.excerpt)} error={e.excerpt} hint="Shown on the blog index and in search results. 20–300 characters." />
        <RichText name="content" label="Content" defaultValue={v.content ?? b.content ?? ''} error={e.content} />
      </Section>

      <Section title="Featured image" hint="Used at the top of the post and when it’s shared. Up to 5MB.">
        <div className="flex flex-wrap items-center gap-4">
          {(preview || b.featuredImage) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview || b.featuredImage} alt="" className="h-28 w-44 rounded-[var(--radius-sm)] object-cover" />
          )}
          <label className="btn btn-ghost cursor-pointer">
            <ImagePlus className="size-4" aria-hidden /> {b.featuredImage || preview ? 'Replace image' : 'Choose image'}
            <input type="file" name="featuredImage" accept="image/jpeg,image/png,image/webp" className="sr-only"
              onChange={(ev) => { const f = ev.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : '') }} />
          </label>
        </div>
        {e.featuredImage && <p className="field-hint !mt-0 !text-danger">{e.featuredImage}</p>}
      </Section>

      <Section title="Categories and tags">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BLOG_CATEGORIES.map((c) => <Checkbox key={c} name="categories" value={c} defaultChecked={cats.includes(c)}>{c}</Checkbox>)}
        </div>
        <Field label="Tags" name="tags" optional defaultValue={val('tags', (b.tags || []).join(', '))} hint="Separate with commas." />
      </Section>

      <Section title="Search engines" hint="Leave blank to use the title and summary.">
        <Field label="SEO title" name="metaTitle" optional maxLength={70} defaultValue={val('metaTitle', b.metaTitle)} />
        <TextArea label="SEO description" name="metaDescription" optional rows={2} maxLength={160} defaultValue={val('metaDescription', b.metaDescription)} />
        <Field label="Keywords" name="metaKeywords" optional defaultValue={val('metaKeywords', b.metaKeywords)} />
      </Section>

      <Section title="Publishing">
        <Select label="Status" name="status" options={[['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']]} defaultValue={val('status', b.status || 'draft')} />
        <Checkbox name="featured" defaultChecked={v.featured ? v.featured === 'on' : !!b.featured}>Feature this post</Checkbox>
      </Section>

      <SaveBar note="Published posts appear on /blog straight away." pending={pending || busy} pendingText={busy ? 'Uploading image…' : 'Saving…'} label={b._id ? 'Save post' : 'Create post'} />
    </form>
  )
}

/* ───────── Bid notice ───────── */

export function BidNoticeForm() {
  const [state, formAction, pending] = useActionState(saveBidNotice, initialState)
  const v = state.values || {}
  const e = state.fieldErrors || {}
  const [lots, setLots] = useState({ total: Number(v.totalLots) || 0, price: Number(v.transactionPricePerLot) || 0, cost: Number(v.transactionCostPerLot) || 0 })
  const n = (x: number) => '₦' + Math.round(x).toLocaleString('en-NG')

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); submitWithUploads(new FormData(ev.currentTarget), formAction) }} className="grid gap-5">
      <FormAlert error={state.error} />
      <Section title="The transaction" hint="Value partners see this on their Bid page.">
        <Field label="Notice title" name="title" optional defaultValue={v.title ?? 'BID NOTICE TO REVAAMP VALUE PARTNERS'} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Transaction number" name="transactionNumber" required defaultValue={v.transactionNumber} error={e.transactionNumber} placeholder="e.g. RVP/2026/014" />
          <Field label="Client" name="client" required defaultValue={v.client} error={e.client} />
        </div>
        <TextArea label="Description" name="description" rows={4} required defaultValue={v.description} error={e.description} />
      </Section>

      <Section title="Lots and pricing">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Number of lots" name="totalLots" type="number" min={1} required defaultValue={v.totalLots} error={e.totalLots} onChange={(ev) => { const n = Number(ev.currentTarget.value); setLots((l) => ({ ...l, total: n })) }} />
          <Field label="Price per lot (₦)" name="transactionPricePerLot" type="number" min={0} required defaultValue={v.transactionPricePerLot} error={e.transactionPricePerLot} onChange={(ev) => { const n = Number(ev.currentTarget.value); setLots((l) => ({ ...l, price: n })) }} />
          <Field label="Cost per lot (₦)" name="transactionCostPerLot" type="number" min={0} required defaultValue={v.transactionCostPerLot} error={e.transactionCostPerLot} onChange={(ev) => { const n = Number(ev.currentTarget.value); setLots((l) => ({ ...l, cost: n })) }} />
          <Field label="Partner profit per lot (₦)" name="profitPerLot" type="number" min={0} required defaultValue={v.profitPerLot} error={e.profitPerLot} />
        </div>
        {lots.total > 0 && lots.price > 0 && (
          <p className="rounded-[var(--radius-sm)] bg-mist px-4 py-3 text-sm text-ink-2">
            Transaction value <strong className="text-ink">{n(lots.total * lots.price)}</strong>
            {lots.cost > 0 && <> · partners fund <strong className="text-ink">{n(lots.total * lots.cost)}</strong> in total</>}
          </p>
        )}
      </Section>

      <Section title="Timeline">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Bidding closes" name="deadline" type="datetime-local" required defaultValue={v.deadline} error={e.deadline} />
          <Field label="Deadline as written" name="deadlineText" optional defaultValue={v.deadlineText} placeholder="e.g. 12 noon, Friday 30 October" />
          <Field label="Days to pay after allocation" name="paymentDays" type="number" min={1} defaultValue={v.paymentDays ?? 2} />
          <Field label="Days until partners are paid" name="paymentToPartnerDays" type="number" min={1} defaultValue={v.paymentToPartnerDays ?? 9} />
        </div>
      </Section>

      <Section title="Terms" hint="One per line.">
        <TextArea label="Conditions" name="conditions" optional rows={4} defaultValue={v.conditions} />
        <TextArea label="Allocation criteria" name="allocationCriteria" optional rows={3} defaultValue={v.allocationCriteria} />
        <TextArea label="Important notes" name="importantNotes" optional rows={3} defaultValue={v.importantNotes} />
      </Section>

      <Section title="Announce it">
        <Checkbox name="emailAll" defaultChecked={v.emailAll ? v.emailAll === 'on' : true}>Email this notice to every registered user</Checkbox>
      </Section>

      <SaveBar note="The notice opens for bids as soon as it’s published." pending={pending} label="Publish bid notice" pendingText="Publishing…" />
    </form>
  )
}
