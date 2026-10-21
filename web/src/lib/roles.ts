import type { UserType } from './session'

export type NavItem = { label: string; href: string; icon: string; match?: string[]; section?: string; badge?: number }

export type RoleConfig = {
  type: UserType
  label: string
  base: string
  nav: NavItem[]
}

const earnNav = (base: string, partner: boolean): NavItem[] => [
  { label: 'Overview', href: `${base}/dashboard`, icon: 'home' },
  { label: 'Promote properties', href: `${base}/properties`, icon: 'building' },
  { label: 'My links', href: `${base}/promotions`, icon: 'link' },
  { label: 'Hotels', href: `${base}/hotels`, icon: 'hotel' },
  { label: 'Introduce', href: `${base}/submit-property`, icon: 'handshake', match: [`${base}/submit-buyer`, `${base}/onboard-hotel`] },
  { label: 'Leads', href: `${base}/leads`, icon: 'inbox' },
  { label: 'Activity', href: `${base}/analytics`, icon: 'chart', match: [`${base}/share-analytics`] },
  { label: 'Earnings', href: `${base}/earnings`, icon: 'wallet' },
  ...(partner ? [{ label: 'Bids', href: `${base}/bid`, icon: 'gavel' }] : []),
  { label: 'Settings', href: `${base}/settings`, icon: 'settings' },
]

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  property_owner: {
    type: 'property_owner',
    label: 'Property owner',
    base: '/property-owner',
    nav: [
      { label: 'Overview', href: '/property-owner/dashboard', icon: 'home', match: ['/property-owner/properties/'] },
      { label: 'Add property', href: '/property-owner/properties/add', icon: 'plus' },
      { label: 'Enquiries', href: '/property-owner/inquiries', icon: 'inbox' },
      { label: 'Earnings', href: '/property-owner/earnings', icon: 'wallet' },
      { label: 'Settings', href: '/property-owner/settings', icon: 'settings' },
    ],
  },
  promoter: { type: 'promoter', label: 'Promoter', base: '/promoter', nav: earnNav('/promoter', false) },
  business_partner: { type: 'business_partner', label: 'Business partner', base: '/business-partner', nav: earnNav('/business-partner', true) },
  project_subscriber: {
    type: 'project_subscriber',
    label: 'Project subscriber',
    base: '/project-subscriber',
    nav: [
      { label: 'Overview', href: '/project-subscriber/dashboard', icon: 'home' },
      { label: 'Projects', href: '/project-subscriber/projects', icon: 'building' },
      { label: 'Bank guarantee', href: '/project-subscriber/bank-guarantee', icon: 'shield' },
      { label: 'Subscription', href: '/project-subscriber/subscription', icon: 'card' },
      { label: 'Settings', href: '/project-subscriber/settings', icon: 'settings' },
    ],
  },
  solicitor: {
    type: 'solicitor',
    label: 'Partner solicitor',
    base: '/solicitor',
    nav: [
      { label: 'Overview', href: '/solicitor/dashboard', icon: 'home' },
      { label: 'KPIs', href: '/solicitor/kpis', icon: 'chart' },
      { label: 'Settings', href: '/solicitor/settings', icon: 'settings' },
    ],
  },
  hectare_solicitor: {
    type: 'hectare_solicitor',
    label: 'HbH solicitor',
    base: '/hectare-solicitor',
    nav: [
      { label: 'Overview', href: '/hectare-solicitor/dashboard', icon: 'home' },
      { label: 'Settings', href: '/hectare-solicitor/settings', icon: 'settings' },
    ],
  },
  architect: {
    type: 'architect',
    label: 'Partner architect',
    base: '/architect',
    nav: [
      { label: 'Overview', href: '/architect/dashboard', icon: 'home', match: ['/architect/assessment/'] },
      { label: 'New assessment', href: '/architect/assessment/new', icon: 'plus' },
      { label: 'Settings', href: '/architect/settings', icon: 'settings' },
    ],
  },
  superadmin: {
    type: 'superadmin',
    label: 'Superadmin',
    base: '/superadmin',
    nav: [
      { label: 'Overview', href: '/superadmin/dashboard', icon: 'home', section: 'Platform' },
      { label: 'Analytics', href: '/superadmin/analytics', icon: 'chart' },
      { label: 'Enquiries', href: '/superadmin/inquiries', icon: 'inbox' },
      { label: 'Properties', href: '/superadmin/properties', icon: 'building', section: 'Listings' },
      { label: 'Hotels', href: '/superadmin/hotels', icon: 'hotel' },
      { label: 'Partner hotels', href: '/superadmin/partner-hotels', icon: 'handshake' },
      { label: 'Blog', href: '/superadmin/blogs', icon: 'file' },
      { label: 'Promoters', href: '/superadmin/promoters', icon: 'megaphone', section: 'People' },
      { label: 'Business partners', href: '/superadmin/business-partners', icon: 'briefcase' },
      { label: 'Property owners', href: '/superadmin/property-owners', icon: 'users' },
      { label: 'Professionals', href: '/superadmin/professionals', icon: 'shield' },
      { label: 'Project subscribers', href: '/superadmin/project-subscribers', icon: 'hardhat', match: ['/superadmin/projects'] },
      { label: 'Room Voucher', href: '/superadmin/voucher-subscribers', icon: 'ticket' },
      { label: 'Transactions', href: '/superadmin/transactions', icon: 'receipt', section: 'Money' },
      { label: 'Withdrawals', href: '/superadmin/withdrawals', icon: 'wallet' },
      { label: 'Voucher stays', href: '/superadmin/voucher-reservations', icon: 'calendar' },
      { label: 'Bid notices', href: '/superadmin/bid-notices', icon: 'gavel' },
      { label: 'Profile', href: '/superadmin/profile', icon: 'user', section: 'Account' },
      { label: 'Platform settings', href: '/superadmin/settings', icon: 'settings' },
    ],
  },
  voucher_subscriber: {
    type: 'voucher_subscriber',
    label: 'Room Voucher',
    base: '/voucher',
    nav: [
      { label: 'Overview', href: '/voucher/dashboard', icon: 'home' },
      { label: 'Reservations', href: '/voucher/reservations', icon: 'calendar' },
      { label: 'Find a hotel', href: '/hotels', icon: 'hotel' },
      { label: 'Settings', href: '/voucher/settings', icon: 'settings' },
    ],
  },
}

/** Status words used across the dashboards, mapped to a tone. */
export const STATUS_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'muted'> = {
  verified: 'ok', available: 'ok', active: 'ok', approved: 'ok', completed: 'ok', paid: 'ok', replied: 'ok', confirmed: 'ok', stayed: 'ok', converted: 'ok', matched: 'ok', sold: 'ok', rented: 'ok', verified_report: 'ok',
  pending: 'warn', pending_payment: 'warn', payment_confirmed: 'info', verification_pending: 'info', pending_verification: 'info', pending_approval: 'info', under_review: 'info', registered: 'info', submitted: 'info', in_progress: 'info', new: 'info', contacted: 'info', read: 'muted',
  rejected: 'bad', cancelled: 'bad', no_show: 'bad', void: 'bad', expired: 'bad', suspended: 'bad', failed: 'bad', spam: 'bad', on_hold: 'warn', delayed: 'warn',
  inactive: 'muted', draft: 'muted', archived: 'muted', closed: 'muted', unavailable: 'muted',
}

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting fee',
  payment_confirmed: 'Fee submitted',
  verification_pending: 'Under review',
  pending_verification: 'Under review',
  pending_approval: 'Awaiting approval',
  in_progress: 'In progress',
  on_hold: 'On hold',
  no_show: 'No-show',
  under_review: 'Under review',
}
