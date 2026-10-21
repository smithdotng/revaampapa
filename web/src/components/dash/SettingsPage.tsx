import type { Viewer } from '@/lib/guard'
import { DashHeader } from './ui'
import { ProfileForm, PasswordForm, BankForm } from './SettingsForms'

/* eslint-disable @typescript-eslint/no-explicit-any */
function fieldsFor(v: Viewer) {
  const d: any = v.doc
  const base = [
    { name: 'name', label: 'Full name', value: d.name },
    { name: 'phone', label: 'Phone', value: d.phone, type: 'tel' },
  ]
  switch (v.type) {
    case 'property_owner':
      return [...base,
        { name: 'company', label: 'Company', value: d.propertyOwnerProfile?.company, optional: true },
        { name: 'rcNumber', label: 'RC number', value: d.propertyOwnerProfile?.rcNumber, optional: true },
        { name: 'address', label: 'Address', value: d.propertyOwnerProfile?.address, optional: true }]
    case 'promoter':
    case 'business_partner':
      return [...base, { name: 'socialHandle', label: 'Main social handle', value: d.promoterProfile?.socialHandle, optional: true }]
    case 'project_subscriber':
      return [...base,
        { name: 'countryOfResidence', label: 'Country of residence', value: d.projectSubscriberProfile?.countryOfResidence, optional: true },
        { name: 'passportNumber', label: 'Passport or ID number', value: d.projectSubscriberProfile?.passportNumber, optional: true }]
    case 'solicitor':
      return [...base, { name: 'lawFirm', label: 'Law firm', value: d.lawFirm }, { name: 'territory', label: 'Territory', value: d.territory }]
    case 'architect':
      return [...base, { name: 'firm', label: 'Practice / firm', value: d.firm }, { name: 'territory', label: 'Territory', value: d.territory, optional: true }]
    case 'voucher_subscriber':
      return [...base,
        { name: 'city', label: 'City', value: d.location?.city, optional: true },
        { name: 'state', label: 'State', value: d.location?.state, optional: true },
        { name: 'country', label: 'Country', value: d.location?.country || 'Nigeria', optional: true }]
    default:
      return base
  }
}

export function SettingsPage({ viewer }: { viewer: Viewer }) {
  const d: any = viewer.doc
  const bank = viewer.type === 'business_partner' ? (d.businessPartnerProfile?.bankDetails?.accountNumber ? d.businessPartnerProfile.bankDetails : d.promoterProfile?.bankDetails) : d.promoterProfile?.bankDetails
  return (
    <>
      <DashHeader title="Settings" intro="Your details, payout account and password." />
      <div className="grid gap-5">
        <ProfileForm fields={fieldsFor(viewer).map((f) => ({ ...f, value: f.value ?? '' }))} email={viewer.email} />
        {(viewer.type === 'promoter' || viewer.type === 'business_partner') && (
          <BankForm bank={bank ? { bankName: bank.bankName, accountNumber: bank.accountNumber, accountName: bank.accountName } : undefined} />
        )}
        <PasswordForm />
      </div>
    </>
  )
}
