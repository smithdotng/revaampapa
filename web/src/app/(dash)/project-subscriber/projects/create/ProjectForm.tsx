'use client'
import { useActionState } from 'react'
import { createProject } from '@/actions/subscriber'
import { initialState } from '@/lib/form'
import { NIGERIAN_STATES } from '@/lib/format'
import { Field, TextArea, Select, SubmitButton, FormAlert } from '@/components/forms'

export function ProjectForm() {
  const [s, action] = useActionState(createProject, initialState)
  const v = s.values || {}; const e = s.fieldErrors || {}
  return (
    <form action={action} className="grid gap-5 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-7">
      <FormAlert error={s.error} />
      <Field label="Project name" name="title" required defaultValue={v.title} error={e.title} placeholder="e.g. 5-bedroom family home, Lokogoma" />
      <Select label="Type" name="projectType" required defaultValue={v.projectType} error={e.projectType}
        options={[['residential', 'Residential'], ['commercial', 'Commercial'], ['industrial', 'Industrial'], ['infrastructure', 'Infrastructure'], ['renovation', 'Renovation']]} />
      <TextArea label="What are you building?" name="description" required rows={5} defaultValue={v.description} error={e.description} placeholder="Size, floors, current stage (land only, foundation…), any designs you already have" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Estimated value (₦)" name="projectValue" type="number" min={1} required defaultValue={v.projectValue} error={e.projectValue} hint="Revaamp’s service fee is 10% of this." />
        <Field label="Expected duration (months)" name="projectDuration" type="number" min={1} max={120} required defaultValue={v.projectDuration} error={e.projectDuration} />
      </div>
      <Field label="Site address" name="address" optional defaultValue={v.address} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City" name="city" required defaultValue={v.city} error={e.city} />
        <Select label="State" name="state" required options={NIGERIAN_STATES} defaultValue={v.state} error={e.state} />
      </div>
      <SubmitButton className="btn btn-primary justify-self-start" pendingText="Submitting…">Submit project</SubmitButton>
    </form>
  )
}
