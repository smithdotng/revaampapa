'use client'
import { useActionState, useState } from 'react'
import { introduceProperty, introduceBuyer, introduceHotel } from '@/actions/earn'
import { initialState } from '@/lib/form'
import { PROPERTY_TYPES } from '@/lib/format'
import { Field, TextArea, Select, FileField, SubmitButton, FormAlert } from '@/components/forms'
import { submitWithUploads } from '@/lib/upload-client'

const card = 'grid gap-5 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-7'

export function IntroducePropertyForm() {
  const [s, action, pending] = useActionState(introduceProperty, initialState)
  const [busy, setBusy] = useState(false)
  const v = s.values || {}; const e = s.fieldErrors || {}
  return (
    <form action={action} onSubmit={(ev) => { ev.preventDefault(); submitWithUploads(new FormData(ev.currentTarget), action, setBusy) }} className={card}>
      <FormAlert error={s.error} />
      <h2 className="t-3">The property</h2>
      <Field label="What is it?" name="propertyTitle" required defaultValue={v.propertyTitle} error={e.propertyTitle} placeholder="e.g. 2 plots of land with C of O, Lugbe" />
      <div className="grid gap-5 sm:grid-cols-3">
        <Select label="Type" name="propertyType" required options={Object.entries(PROPERTY_TYPES)} defaultValue={v.propertyType} error={e.propertyType} />
        <Field label="Location" name="propertyLocation" required defaultValue={v.propertyLocation} error={e.propertyLocation} placeholder="City, state" />
        <Field label="Asking price (₦)" name="propertyValue" type="number" min={0} optional defaultValue={v.propertyValue} />
      </div>
      <TextArea label="Anything else we should know" name="propertyDescription" optional rows={3} defaultValue={v.propertyDescription} />
      <h2 className="t-3 mt-2">The owner</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Name" name="ownerName" required defaultValue={v.ownerName} error={e.ownerName} />
        <Field label="Phone" name="ownerPhone" type="tel" required defaultValue={v.ownerPhone} error={e.ownerPhone} />
        <Field label="Email" name="ownerEmail" type="email" optional defaultValue={v.ownerEmail} error={e.ownerEmail} />
      </div>
      <FileField label="Photos or documents" name="documents" accept="image/*,.pdf,.doc,.docx" multiple optional hint="Up to 6 files, 10MB each" />
      {e.documents && <p className="field-hint !mt-0 !text-danger">{e.documents}</p>}
      <SubmitButton className="btn btn-primary justify-self-start" pending={pending || busy} pendingText="Submitting…">Introduce this property</SubmitButton>
    </form>
  )
}

export function IntroduceBuyerForm({ properties }: { properties: [string, string][] }) {
  const [s, action] = useActionState(introduceBuyer, initialState)
  const v = s.values || {}; const e = s.fieldErrors || {}
  return (
    <form action={action} className={card}>
      <FormAlert error={s.error} />
      <h2 className="t-3">The buyer</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Name" name="buyerName" required defaultValue={v.buyerName} error={e.buyerName} />
        <Field label="Phone" name="buyerPhone" type="tel" required defaultValue={v.buyerPhone} error={e.buyerPhone} />
        <Field label="Email" name="buyerEmail" type="email" optional defaultValue={v.buyerEmail} error={e.buyerEmail} />
      </div>
      <h2 className="t-3 mt-2">What they want</h2>
      <Select label="A listing they’re interested in" name="propertyInterested" optional options={properties} defaultValue={v.propertyInterested} placeholder="None in particular" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Budget (₦)" name="budget" type="number" min={0} optional defaultValue={v.budget} />
        <Field label="Preferred location" name="locationPreference" optional defaultValue={v.locationPreference} error={e.locationPreference} placeholder="e.g. Gwarinpa or Lugbe" />
      </div>
      <TextArea label="Notes" name="message" optional rows={3} defaultValue={v.message} placeholder="Type of property, timeline, how they’ll pay" />
      <SubmitButton className="btn btn-primary justify-self-start" pendingText="Submitting…">Introduce this buyer</SubmitButton>
    </form>
  )
}

export function IntroduceHotelForm() {
  const [s, action] = useActionState(introduceHotel, initialState)
  const v = s.values || {}; const e = s.fieldErrors || {}
  return (
    <form action={action} className={card}>
      <FormAlert error={s.error} />
      <h2 className="t-3">The hotel</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Hotel name" name="hotelName" required defaultValue={v.hotelName} error={e.hotelName} />
        <Field label="City and state" name="hotelLocation" required defaultValue={v.hotelLocation} error={e.hotelLocation} />
      </div>
      <Field label="Address" name="hotelAddress" optional defaultValue={v.hotelAddress} />
      <h2 className="t-3 mt-2">Who to speak to</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Contact person" name="contactPerson" required defaultValue={v.contactPerson} error={e.contactPerson} />
        <Field label="Phone" name="contactPhone" type="tel" required defaultValue={v.contactPhone} error={e.contactPhone} />
        <Field label="Email" name="contactEmail" type="email" optional defaultValue={v.contactEmail} error={e.contactEmail} />
      </div>
      <SubmitButton className="btn btn-primary justify-self-start" pendingText="Submitting…">Introduce this hotel</SubmitButton>
    </form>
  )
}
