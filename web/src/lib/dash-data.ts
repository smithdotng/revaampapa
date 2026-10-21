/* eslint-disable @typescript-eslint/no-explicit-any */

/** Bucket items into the last six calendar months by a date field. */
export function lastSixMonths<T>(items: T[], dateKey: keyof T, value: (t: T) => number) {
  const out: { label: string; value: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const sum = items.reduce((s, t: any) => {
      const d = new Date(t[dateKey])
      return d >= start && d < end ? s + value(t) : s
    }, 0)
    out.push({ label: start.toLocaleString('en-GB', { month: 'short' }), value: sum })
  }
  return out
}
