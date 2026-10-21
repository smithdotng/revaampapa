export const PLANS = {
  basic: { name: 'Basic', price: 50000, features: ['Up to 2 active projects', 'Basic reporting', 'Email support', 'Project tracking'] },
  premium: { name: 'Premium', price: 150000, features: ['Up to 5 active projects', 'Advanced reporting', 'Priority support', 'Dedicated project manager', 'Weekly updates'], recommended: true },
  enterprise: { name: 'Enterprise', price: 500000, features: ['Unlimited projects', 'Custom reporting', '24/7 dedicated support', 'Multiple project managers', 'Daily updates', 'On-site visits'] },
} as const
export type PlanKey = keyof typeof PLANS
