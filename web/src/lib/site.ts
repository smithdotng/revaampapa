/**
 * Site-wide content and contact details. Edit here, not in components.
 */
export const SITE = {
  name: 'RevaampAPA',
  legalName: 'Revacom Nigeria Limited',
  tagline: 'Aggregation, Promotions & Agency Platform',
  description:
    'Real estate development across Africa: verified listings, a promoter network that earns on every deal, partner hotels with Room Voucher cashback, and project management for your build.',
  url: process.env.BASE_URL || 'https://revaampapa.com',
  email: 'info@revaampapa.com',
  supportEmail: 'support@revaampapa.com',
  // TODO(Hugo): the current site shows a placeholder number. Replace with the real line.
  phone: '+234 800 000 0000',
  address: ['Suite 6, Block B', 'Ebitu Ukiwe Street, Jabi', 'Abuja, Nigeria'],
  hours: [
    ['Monday – Friday', '9:00 – 18:00'],
    ['Saturday', '10:00 – 14:00'],
    ['Sunday', 'Closed'],
  ] as const,
  social: [
    { label: 'Facebook', href: 'https://www.facebook.com/revaampap' },
    { label: 'Instagram', href: 'https://www.instagram.com/revaampap' },
    { label: 'X (Twitter)', href: 'https://www.twitter.com/revaampap' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/revaampap' },
  ],
}

export type Role = {
  slug: string
  name: string
  short: string
  summary: string
  /** The single number that matters most for this role */
  figure: string
  figureLabel: string
  benefits: string[]
  cta: { label: string; href: string }
  group: 'property' | 'earn' | 'hotels' | 'professional'
}

export const ROLES: Role[] = [
  {
    slug: 'promoter',
    name: 'Property Promoter',
    short: 'Promoter',
    summary: 'Share listings with your network and earn on every introduction. Free to join.',
    figure: '90%',
    figureLabel: 'of the buyer’s agency fee',
    benefits: [
      'Introduce a property for sale: 40% of the agency fee',
      'Introduce a buyer: 90% of the fee from the buyer, plus 50% from the seller',
      'Introduce a promoter: 70% residual income each time they earn',
      'Partner hotel onboarding: 30% of the commission',
      'Room Voucher subscriber: 50% of the subscription fee',
      'Business Partner referral: ₦10,000 · Sub-aggregator referral: ₦25,000',
    ],
    cta: { label: 'Become a promoter — free', href: '/promoter/register' },
    group: 'earn',
  },
  {
    slug: 'property-owner',
    name: 'Property Owner',
    short: 'Property owner',
    summary: 'List unlimited properties in front of a promoter network across Africa.',
    figure: '₦20,000',
    figureLabel: 'verification fee per listing',
    benefits: [
      'List unlimited properties — pay only when you list',
      'Connect with verified developers and off-takers',
      'Access to cheap development funds',
      'Unlock capital from your property before it sells',
      'Sell or lease for a Revacom Food Court and earn daily income',
    ],
    cta: { label: 'List your property', href: '/register' },
    group: 'property',
  },
  {
    slug: 'project-subscriber',
    name: 'Project Management Subscriber',
    short: 'Build my home',
    summary: 'Build your home or project with no upfront payment for construction milestones.',
    figure: '₦0',
    figureLabel: 'upfront for each milestone',
    benefits: [
      'Pay only after each milestone is delivered to your satisfaction',
      'Construction finance credit and instalment design fees',
      'Discounts and quality assurance on building materials',
      'Pre-qualified contractors, design professionals and artisans',
      'Monitoring and evaluation at no extra cost',
    ],
    cta: { label: 'Subscribe', href: '/project-subscriber/register' },
    group: 'property',
  },
  {
    slug: 'business-partner',
    name: 'Business Partner',
    short: 'Business partner',
    summary: 'Everything a promoter earns, plus partner referrals, supply contracts and white-label tools.',
    figure: '₦20,000',
    figureLabel: 'one-off partnership fee',
    benefits: [
      'All promoter income streams',
      '20% of the administrative fee from partners you introduce',
      'Premium Discount Forward & Supply Contracts, created weekly',
      'White-label solutions under your own brand',
      'Dedicated account manager and priority support',
    ],
    cta: { label: 'Apply as a partner', href: '/business-partner/register' },
    group: 'earn',
  },
  {
    slug: 'room-voucher',
    name: 'Room Voucher Subscriber',
    short: 'Room Voucher',
    summary: 'Discounted rates at every listed hotel, paid back to you as cashback after the stay.',
    figure: 'Cashback',
    figureLabel: 'on every registered stay',
    benefits: [
      'One membership covers the whole Revaamp hotel directory',
      'Your discount is paid to you as cashback, not held as credit',
      'Register the stay before check-in — that registration is the claim',
      'Book with the hotel as normal; no booking fees',
      'Track every stay and payout in your subscriber dashboard',
    ],
    cta: { label: 'Subscribe to the Room Voucher', href: '/voucher/register' },
    group: 'hotels',
  },
  {
    slug: 'partner-hotel',
    name: 'Partner Hotel',
    short: 'Partner hotel',
    summary: 'List your hotel and get your rooms off-taken by Revaamp.',
    figure: 'Off-take',
    figureLabel: 'your rooms taken up by Revaamp',
    benefits: [
      'Get your rooms off-taken by Revaamp — not just listed and left',
      'Published on the Revaamp hotel directory',
      'Marketed by promoters and business partners across Africa',
      'Corporate, conference and relocation demand from our partners',
      'Featured placement available',
    ],
    cta: { label: 'List your hotel', href: '/partner-hotel/register' },
    group: 'hotels',
  },
  {
    slug: 'partner-solicitor',
    name: 'Partner Solicitor',
    short: 'Solicitor',
    summary: 'Provide legal services across Africa’s real estate ecosystem. 10+ years’ practice required.',
    figure: '70%',
    figureLabel: 'of legal fees on transactions you initiate',
    benefits: [
      'Free training on Revaamp solutions and schemes',
      'Access to a pan-African legal ecosystem',
      '60% of monthly legal fees from aggregation',
      'Participate in the Revaamp HbH programme',
    ],
    cta: { label: 'Apply as Partner Solicitor', href: '/solicitor/register' },
    group: 'professional',
  },
  {
    slug: 'hbh-solicitor',
    name: 'HbH Solicitor',
    short: 'HbH solicitor',
    summary: 'Support cooperative societies in agriculture and real estate, Hectare by Hectare.',
    figure: 'Project fees',
    figureLabel: 'from assigned cooperatives',
    benefits: [
      'Provide legal services to assigned cooperative societies',
      'Learn agricultural financing mechanisms',
      'End-to-end support for agribusiness transactions',
      'No minimum experience; documents optional',
    ],
    cta: { label: 'Join as HbH Solicitor', href: '/solicitor/hectare/register' },
    group: 'professional',
  },
  {
    slug: 'partner-architect',
    name: 'Partner Architect',
    short: 'Architect',
    summary: 'Put your practice to work across Africa’s project pipeline.',
    figure: '54',
    figureLabel: 'African countries open to you',
    benefits: [
      'Conduct structural assessments of proposed projects',
      'A steady pipeline of design and project briefs',
      'Project-based and recurring design fees',
      'Collaborate with vetted contractors and developers',
    ],
    cta: { label: 'Register as Partner Architect', href: '/architect/register' },
    group: 'professional',
  },
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is RevaampAPA?',
    a: 'RevaampAPA (Revaamps — Aggregation, Promotions and Agency Platform) is one programme for real estate development across Africa, bringing together aggregation, promotion and project management. Owners list verified property, promoters market it and earn, and subscribers build with milestone-based payments.',
  },
  {
    q: 'How much does it cost to become a promoter?',
    a: 'Nothing. There is no registration fee. You earn when a property, buyer or promoter you introduce leads to a transaction.',
  },
  {
    q: 'What is the difference between a promoter and a Business Partner?',
    a: 'Business Partners earn everything a promoter does, plus 20% from partner referrals, access to Premium Discount Forward & Supply Contracts, white-label solutions and a dedicated account manager. The partnership fee is ₦20,000.',
  },
  {
    q: 'What does a property owner pay?',
    a: 'Registration is free. You pay a ₦20,000 verification fee when you list a property; our team then verifies it before it goes live.',
  },
  {
    q: 'What are the administrative fee deductions?',
    a: 'Income from the Revaamp Agency Scheme carries a 10% administrative fee. All other programme income carries 3.5%.',
  },
  {
    q: 'How does Room Voucher cashback work?',
    a: 'Subscribe, then register your stay against a listed hotel before you check in. Book and pay the hotel as normal. Once the stay is confirmed, we pay your discount to you as cashback. A stay that was never registered can’t be claimed afterwards.',
  },
]

export const NAV = [
  { label: 'Properties', href: '/properties' },
  { label: 'Hotels', href: '/hotels' },
  { label: 'Room Voucher', href: '/voucher/register' },
  { label: 'Projects', href: '/projects' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Blog', href: '/blog' },
]
