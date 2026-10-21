/* eslint-disable @typescript-eslint/no-explicit-any */
export function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

/** Same rules as voucherController.summarise in the Express app. */
export function summarise(rs: any[]) {
  const sum = (list: any[], f: (r: any) => number) => list.reduce((t, r) => t + (f(r) || 0), 0)
  const live = rs.filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
  return {
    total: rs.length,
    upcoming: rs.filter((r) => ['registered', 'confirmed'].includes(r.status) && new Date(r.checkInDate) >= startOfToday()).length,
    nights: sum(live, (r) => r.nights),
    pending: sum(live.filter((r) => r.cashbackStatus === 'pending'), (r) => r.cashbackAmount),
    approved: sum(live.filter((r) => r.cashbackStatus === 'approved'), (r) => r.cashbackAmount),
    paid: sum(rs.filter((r) => r.cashbackStatus === 'paid'), (r) => r.cashbackAmount),
  }
}
