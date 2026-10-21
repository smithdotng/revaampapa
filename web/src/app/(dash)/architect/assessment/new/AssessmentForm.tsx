'use client'
import { useActionState, useState, type FormEvent } from 'react'
import { submitAssessment } from '@/actions/pro'
import { initialState } from '@/lib/form'
import { Field, TextArea, Select, FileField, SubmitButton, FormAlert } from '@/components/forms'
import { submitWithUploads } from '@/lib/upload-client'

const SECTIONS: [string, string, string?][] = [
  ['siteConditions', 'Site conditions', 'Soil, topography, drainage, access'],
  ['foundationAssessment', 'Foundation'],
  ['structuralDesignReview', 'Structural design review'],
  ['materialsAssessment', 'Materials'],
  ['loadBearingEvaluation', 'Load-bearing evaluation'],
  ['complianceWithCodes', 'Compliance with building codes'],
  ['identifiedRisks', 'Risks identified'],
  ['recommendations', 'Recommendations'],
]

export function AssessmentForm() {
  const [s, action, pending] = useActionState(submitAssessment, initialState)
  const [busy, setBusy] = useState(false)
  const [rec, setRec] = useState(s.values?.recommendation || 'approved')
  const v = s.values || {}; const e = s.fieldErrors || {}
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => { ev.preventDefault(); submitWithUploads(new FormData(ev.currentTarget), action, setBusy) }
  const card = 'grid gap-5 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:p-7'
  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <FormAlert error={s.error} />
      <section className={card}>
        <h2 className="t-3">Project</h2>
        <Field label="Project title" name="projectTitle" required defaultValue={v.projectTitle} error={e.projectTitle} />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Location" name="projectLocation" optional defaultValue={v.projectLocation} />
          <Field label="Promoter / client" name="promoterName" optional defaultValue={v.promoterName} />
          <Field label="Proposed use" name="proposedUse" optional defaultValue={v.proposedUse} placeholder="e.g. Residential, 3 floors" />
        </div>
      </section>
      <section className={card}>
        <h2 className="t-3">Findings</h2>
        {SECTIONS.map(([k, label, hint]) => <TextArea key={k} label={label} name={k} rows={3} optional={k !== 'siteConditions'} required={k === 'siteConditions'} defaultValue={v[k]} error={e[k]} hint={hint} />)}
      </section>
      <section className={card}>
        <h2 className="t-3">Verdict</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Structural integrity" name="structuralIntegrityRating" required defaultValue={v.structuralIntegrityRating || 'good'} error={e.structuralIntegrityRating}
            options={[['excellent', 'Excellent'], ['good', 'Good'], ['fair', 'Fair'], ['poor', 'Poor']]} />
          <div>
            <label htmlFor="f-recommendation" className="field-label">Recommendation</label>
            <select id="f-recommendation" name="recommendation" className="input" value={rec} onChange={(x) => setRec(x.target.value)}>
              <option value="approved">Approve</option>
              <option value="approved_with_conditions">Approve with conditions</option>
              <option value="rejected">Do not approve</option>
            </select>
          </div>
        </div>
        {rec === 'approved_with_conditions' && <TextArea label="Conditions" name="conditions" rows={3} required defaultValue={v.conditions} error={e.conditions} />}
        <TextArea label="Remarks" name="remarks" rows={3} optional defaultValue={v.remarks} />
        <FileField label="Supporting documents" name="supportingDocuments" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple optional hint="Drawings, photos, calculations. Up to 8 files, 15MB each." />
        {e.supportingDocuments && <p className="field-hint !mt-0 !text-danger">{e.supportingDocuments}</p>}
      </section>
      <SubmitButton pending={pending || busy} className="btn btn-primary justify-self-start" pendingText="Submitting…">Submit report</SubmitButton>
    </form>
  )
}
