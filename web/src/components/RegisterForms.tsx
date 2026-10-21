'use client'
import { useActionState, useState, type ReactNode, type FormEvent } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import {
  registerOwner, registerPromoter, registerBusinessPartner, registerProjectSubscriber,
  registerSolicitor, registerHbhSolicitor, registerArchitect, registerPartnerHotel,
} from '@/actions/register'
import { registerSubscriber } from '@/actions/voucher'
import { initialState, type FormState } from '@/lib/form'
import { AMENITIES, NIGERIAN_STATES } from '@/lib/format'
import { Field, TextArea, Select, PasswordFields, FileField, Checkbox, SubmitButton, FormAlert } from './forms'
import { submitWithUploads } from '@/lib/upload-client'

type Action = (s: FormState, fd: FormData) => Promise<FormState>

const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Rwanda', 'Uganda', 'Tanzania', 'Cameroon', 'Côte d’Ivoire', 'Senegal',
  'Egypt', 'Ethiopia', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Benin', 'Togo', 'Sierra Leone', 'Liberia', 'Gambia',
  'United Kingdom', 'United States', 'Canada', 'Other',
]
const DOC = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-line pt-7 first:border-t-0 first:pt-0">
      <legend className="contents">
        <span className="t-3 block">{title}</span>
      </legend>
      {hint && <p className="-mt-3 text-sm text-muted">{hint}</p>}
      {children}
    </fieldset>
  )
}

function Shell({ action, children, submit, pending = 'Creating your account…', encType }: {
  action: Action; children: (s: FormState) => ReactNode; submit: string; pending?: string; encType?: boolean
}) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const [busy, setBusy] = useState(false)
  // Submit manually so React doesn't reset the form after a failed attempt:
  // long forms keep every value, including chosen files. `action` remains as a no-JS fallback.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    submitWithUploads(new FormData(e.currentTarget), formAction, setBusy)
  }
  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-8" {...(encType ? { encType: 'multipart/form-data' } : {})}>
      <FormAlert error={state.error} />
      {children(state)}
      <div className="grid gap-5 border-t border-line pt-7">
        <Checkbox name="terms" required>
          I agree to the <Link href="/terms" className="link" target="_blank">terms of service</Link> and{' '}
          <Link href="/privacy" className="link" target="_blank">privacy policy</Link>.
        </Checkbox>
        {state.fieldErrors?.terms && <p className="field-hint !mt-0 !text-danger">{state.fieldErrors.terms}</p>}
        <SubmitButton pendingText={pending} pending={isPending || busy}>{submit}</SubmitButton>
        <p className="text-center text-[0.95rem] text-ink-2">
          Already registered? <Link href="/login" className="link font-medium">Sign in</Link>
        </p>
      </div>
    </form>
  )
}

function Basics({ s, phoneHint = 'e.g. 08012345678' }: { s: FormState; phoneHint?: string }) {
  const v = s.values || {}
  const e = s.fieldErrors || {}
  return (
    <>
      <Field label="Full name" name="name" required autoComplete="name" defaultValue={v.name} error={e.name} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={v.email} error={e.email} />
        <Field label="Phone" name="phone" type="tel" required autoComplete="tel" defaultValue={v.phone} error={e.phone} hint={phoneHint} />
      </div>
      <PasswordFields error={e.password} />
    </>
  )
}

export function OwnerForm() {
  return (
    <Shell action={registerOwner} submit="Create owner account">
      {(s) => (
        <>
          <Section title="Your details"><Basics s={s} /></Section>
          <Section title="Company" hint="Only if you list on behalf of a business.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Company name" name="company" optional defaultValue={s.values?.company} />
              <Field label="RC number" name="rcNumber" optional defaultValue={s.values?.rcNumber} />
            </div>
            <Checkbox name="newsletter" defaultChecked={s.values?.newsletter === 'on'}>Send me the weekly property newsletter</Checkbox>
          </Section>
        </>
      )}
    </Shell>
  )
}

export function PromoterForm({ referralCode }: { referralCode?: string }) {
  return (
    <Shell action={registerPromoter} submit="Create my free promoter account">
      {(s) => (
        <>
          <input type="hidden" name="ref" value={s.values?.ref ?? referralCode ?? ''} />
          <Section title="Your details"><Basics s={s} /></Section>
          <Section title="Your audience" hint="Helps us send you listings your network will care about.">
            <Field label="Main social handle" name="socialHandle" optional placeholder="@yourname on Instagram, X, TikTok…" defaultValue={s.values?.socialHandle} />
            <Select label="Sales or real estate experience" name="experience" optional defaultValue={s.values?.experience}
              options={[['none', 'New to this'], ['under-2', 'Less than 2 years'], ['2-5', '2–5 years'], ['5-plus', 'More than 5 years']]} />
          </Section>
        </>
      )}
    </Shell>
  )
}

export function BusinessPartnerForm({ bank, referralCode }: { bank: ReactNode; referralCode?: string }) {
  return (
    <Shell action={registerBusinessPartner} submit="Submit application" pending="Uploading and submitting…" encType>
      {(s) => (
        <>
          <input type="hidden" name="ref" value={s.values?.ref ?? referralCode ?? ''} />
          <Section title="Your details"><Basics s={s} /></Section>
          <Section title="Pay the ₦20,000 partnership fee" hint="Transfer the fee, then add the reference and receipt below. We verify payments within one working day.">
            {bank}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Transfer reference" name="paymentReference" required defaultValue={s.values?.paymentReference} error={s.fieldErrors?.paymentReference} />
              <Field label="Date paid" name="paymentDate" type="date" defaultValue={s.values?.paymentDate} max={new Date().toISOString().slice(0, 10)} />
            </div>
            <FileField label="Payment receipt" name="paymentProof" accept={DOC} hint="PDF or image, up to 10MB" required />
            {s.fieldErrors?.paymentProof && <p className="field-hint !mt-0 !text-danger">{s.fieldErrors.paymentProof}</p>}
          </Section>
          <Section title="About you">
            <Field label="Main social handle" name="socialHandle" optional defaultValue={s.values?.socialHandle} />
            <TextArea label="Business background" name="experience" optional rows={3} defaultValue={s.values?.experience} placeholder="What you do today and the network you can reach" />
          </Section>
        </>
      )}
    </Shell>
  )
}

export function ProjectSubscriberForm() {
  return (
    <Shell action={registerProjectSubscriber} submit="Create subscriber account">
      {(s) => (
        <>
          <Section title="Your details"><Basics s={s} phoneHint="Include the country code if outside Nigeria" /></Section>
          <Section title="Where you live" hint="Many subscribers build from abroad — that’s what monitoring is for.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Select label="Country of residence" name="countryOfResidence" required options={COUNTRIES} defaultValue={s.values?.countryOfResidence} error={s.fieldErrors?.countryOfResidence} />
              <Field label="Passport or ID number" name="passportNumber" optional defaultValue={s.values?.passportNumber} />
            </div>
          </Section>
        </>
      )}
    </Shell>
  )
}

export function SolicitorForm() {
  return (
    <Shell action={registerSolicitor} submit="Submit application" pending="Uploading and submitting…" encType>
      {(s) => {
        const v = s.values || {}
        const e = s.fieldErrors || {}
        return (
          <>
            <Section title="Your details"><Basics s={s} phoneHint="Include the country code" /></Section>
            <Section title="Your practice">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Law firm" name="lawFirm" required defaultValue={v.lawFirm} error={e.lawFirm} />
                <Field label="Bar / enrolment number" name="barNumber" required defaultValue={v.barNumber} error={e.barNumber} />
                <Select label="Country of practice" name="countryOfPractice" required options={COUNTRIES} defaultValue={v.countryOfPractice} error={e.countryOfPractice} />
                <Field label="Territory you’ll cover" name="territory" required placeholder="State or region" defaultValue={v.territory} error={e.territory} />
                <Field label="Years in practice" name="yearsOfPractice" type="number" min={0} max={70} required defaultValue={v.yearsOfPractice} error={e.yearsOfPractice} hint="Minimum 10 years." />
              </div>
              <TextArea label="Areas of practice" name="experience" optional rows={3} defaultValue={v.experience} placeholder="e.g. Property, conveyancing, corporate" />
            </Section>
            <Section title="Documents" hint="PDF, Word or image, up to 10MB each.">
              <FileField label="Call to Bar certificate" name="barCertificate" accept={DOC} optional />
              <FileField label="Firm registration" name="firmRegistration" accept={DOC} optional />
              <FileField label="Professional profile / CV" name="professionalProfile" accept={DOC} optional />
            </Section>
          </>
        )
      }}
    </Shell>
  )
}

export function HbhSolicitorForm() {
  return (
    <Shell action={registerHbhSolicitor} submit="Submit application" pending="Submitting…" encType>
      {(s) => (
        <>
          <Section title="Your details"><Basics s={s} phoneHint="Include the country code" /></Section>
          <Section title="Your practice">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Bar / enrolment number" name="barNumber" required defaultValue={s.values?.barNumber} error={s.fieldErrors?.barNumber} />
              <Select label="Country of practice" name="countryOfPractice" required options={COUNTRIES} defaultValue={s.values?.countryOfPractice} error={s.fieldErrors?.countryOfPractice} />
            </div>
          </Section>
          <Section title="Documents" hint="Optional, but they speed up approval.">
            <FileField label="Call to Bar certificate" name="barCertificate" accept={DOC} optional hint="PDF, Word or image, up to 10MB" />
            <FileField label="Professional profile / CV" name="professionalProfile" accept={DOC} optional hint="PDF, Word or image, up to 10MB" />
          </Section>
        </>
      )}
    </Shell>
  )
}

const SPECIALISMS = ['Residential', 'Commercial', 'Hospitality', 'Industrial', 'Urban planning', 'Interior', 'Landscape', 'Structural assessment']

export function ArchitectForm() {
  return (
    <Shell action={registerArchitect} submit="Submit application" pending="Uploading and submitting…" encType>
      {(s) => {
        const v = s.values || {}
        const e = s.fieldErrors || {}
        const chosen = (v.specialization || '').split(',')
        return (
          <>
            <Section title="Your details"><Basics s={s} phoneHint="Include the country code" /></Section>
            <Section title="Your practice">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Practice / firm" name="firm" required defaultValue={v.firm} error={e.firm} />
                <Field label="ARCON or registration number" name="arconNumber" required defaultValue={v.arconNumber} error={e.arconNumber} />
                <Select label="Country of practice" name="countryOfPractice" required options={COUNTRIES} defaultValue={v.countryOfPractice} error={e.countryOfPractice} />
                <Field label="Territory" name="territory" optional placeholder="State or region" defaultValue={v.territory} />
              </div>
              <div>
                <span className="field-label">Specialisms <span className="font-normal text-muted">(optional)</span></span>
                <div className="flex flex-wrap gap-2">
                  {SPECIALISMS.map((x) => (
                    <label key={x} className="cursor-pointer">
                      <input type="checkbox" name="specialization" value={x} defaultChecked={chosen.includes(x)} className="peer sr-only" />
                      <span className="inline-block rounded-full border border-line-2 bg-white px-3.5 py-2 text-sm font-medium transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal">{x}</span>
                    </label>
                  ))}
                </div>
              </div>
              <TextArea label="Experience" name="experience" optional rows={3} defaultValue={v.experience} placeholder="Years in practice and notable projects" />
            </Section>
            <Section title="Documents" hint="PDF, Word or image, up to 10MB each.">
              <FileField label="ARCON certificate" name="arconCertificate" accept={DOC} optional />
              <FileField label="Firm registration" name="firmRegistration" accept={DOC} optional />
              <FileField label="Portfolio or CV" name="professionalProfile" accept={DOC} optional />
            </Section>
          </>
        )
      }}
    </Shell>
  )
}

function RoomTypes() {
  const [rows, setRows] = useState([0])
  return (
    <div className="grid gap-3">
      <span className="field-label !mb-0">Room types <span className="font-normal text-muted">(optional)</span></span>
      {rows.map((id, i) => (
        <div key={id} className="grid grid-cols-[1fr_7rem_5.5rem_auto] items-end gap-2">
          <input name="roomTypeName" aria-label={`Room type ${i + 1} name`} placeholder="e.g. Deluxe double" className="input" />
          <input name="roomTypePrice" aria-label={`Room type ${i + 1} nightly rate`} type="number" min={0} placeholder="₦ / night" className="input" />
          <input name="roomTypeCount" aria-label={`Room type ${i + 1} number of rooms`} type="number" min={0} placeholder="Rooms" className="input" />
          <button type="button" onClick={() => setRows((r) => r.filter((x) => x !== id))} disabled={rows.length === 1}
            className="grid size-12 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-white hover:text-danger disabled:opacity-30" aria-label="Remove room type">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setRows((r) => [...r, Date.now()])} className="inline-flex items-center gap-2 justify-self-start text-sm font-semibold text-teal-ink hover:text-ink">
        <Plus className="size-4" /> Add another room type
      </button>
    </div>
  )
}

export function PartnerHotelForm({ referralCode }: { referralCode?: string }) {
  return (
    <Shell action={registerPartnerHotel} submit="Submit hotel for review" pending="Uploading and submitting…" encType>
      {(s) => {
        const v = s.values || {}
        const e = s.fieldErrors || {}
        const chosen = (v.amenities || '').split(',')
        return (
          <>
            <input type="hidden" name="ref" value={v.ref ?? referralCode ?? ''} />
            <Section title="Contact person" hint="We email this person about the application. Partner hotels don’t get a sign-in area.">
              <Basics s={s} phoneHint="The best number to reach you" />
              <Field label="Your role at the hotel" name="position" optional placeholder="e.g. General manager" defaultValue={v.position} />
            </Section>
            <Section title="The hotel">
              <Field label="Hotel name" name="hotelName" required defaultValue={v.hotelName} error={e.hotelName} />
              <TextArea label="Description" name="description" required rows={5} defaultValue={v.description} error={e.description} placeholder="Rooms, facilities, what guests love, nearby landmarks" />
              <div className="grid gap-5 sm:grid-cols-3">
                <Select label="Star rating" name="starRating" optional defaultValue={v.starRating} options={['1', '2', '3', '4', '5']} />
                <Field label="Number of rooms" name="numberOfRooms" type="number" min={1} optional defaultValue={v.numberOfRooms} />
                <Field label="Year opened" name="yearEstablished" type="number" min={1900} max={new Date().getFullYear()} optional defaultValue={v.yearEstablished} />
              </div>
              <Field label="Website" name="website" type="url" optional placeholder="https://" defaultValue={v.website} />
              <RoomTypes />
              <div>
                <span className="field-label">Amenities</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(AMENITIES).map(([k, l]) => (
                    <label key={k} className="cursor-pointer">
                      <input type="checkbox" name="amenities" value={k} defaultChecked={chosen.includes(k)} className="peer sr-only" />
                      <span className="inline-block rounded-full border border-line-2 bg-white px-3.5 py-2 text-sm font-medium transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Section>
            <Section title="Location">
              <Field label="Street address" name="address" optional defaultValue={v.address} autoComplete="street-address" />
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="City" name="city" required defaultValue={v.city} error={e.city} />
                <Field label="State / region" name="state" required defaultValue={v.state} error={e.state} list="ng-states" />
                <Select label="Country" name="country" defaultValue={v.country || 'Nigeria'} options={COUNTRIES} />
              </div>
              <datalist id="ng-states">{NIGERIAN_STATES.map((x) => <option key={x} value={x} />)}</datalist>
            </Section>
            <Section title="Photos and documents" hint="We verify CAC registration and the operating licence before publishing.">
              <FileField label="Hotel photos" name="images" accept="image/jpeg,image/png,image/webp" multiple optional hint="Up to 10 images. The first becomes the cover photo." />
              {e.images && <p className="field-hint !mt-0 !text-danger">{e.images}</p>}
              <FileField label="CAC certificate" name="cacCertificate" accept={DOC} optional hint="PDF or image, up to 10MB" />
              <FileField label="Operating licence" name="hotelLicence" accept={DOC} optional hint="PDF or image, up to 10MB" />
              <FileField label="Rate card / policy" name="ratePolicy" accept={DOC} optional hint="PDF or image, up to 10MB" />
            </Section>
          </>
        )
      }}
    </Shell>
  )
}

export function VoucherForm({ referralCode }: { referralCode?: string }) {
  return (
    <Shell action={registerSubscriber} submit="Subscribe to the Room Voucher" pending="Subscribing…">
      {(s) => (
        <>
          <input type="hidden" name="ref" value={s.values?.ref ?? referralCode ?? ''} />
          <Section title="Your details"><Basics s={s} phoneHint="Include the country code if outside Nigeria" /></Section>
          <Section title="Where you’re based" hint="Optional — helps us add hotels near you.">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="City" name="city" optional defaultValue={s.values?.city} />
              <Field label="State" name="state" optional defaultValue={s.values?.state} list="ng-states-v" />
              <Select label="Country" name="country" defaultValue={s.values?.country || 'Nigeria'} options={COUNTRIES} />
            </div>
            <datalist id="ng-states-v">{NIGERIAN_STATES.map((x) => <option key={x} value={x} />)}</datalist>
          </Section>
        </>
      )}
    </Shell>
  )
}
