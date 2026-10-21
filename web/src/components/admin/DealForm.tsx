'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Plus } from 'lucide-react'
import { recordDeal } from '@/actions/admin'
import { toast } from '@/components/NoticeToast'

type Opt = { id: string; label: string; price?: number; type?: string }

/** Record a closed sale or letting so the promoter who brought it is paid. */
export function DealForm({ properties, promoters, split }: { properties: Opt[]; promoters: Opt[]; split: { promoter: number; owner: number } }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('')
  const [promoter, setPromoter] = useState('')
  const router = useRouter()
  const feeN = fee ? Number(fee) : Math.round(Number(amount || 0) * 0.1)
  const share = promoter ? Math.round((feeN * split.promoter) / 100) : 0

  if (!open) {
    return <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Record a deal</button>
  }
  return (
    <form
      className="grid gap-5 rounded-[var(--radius-lg)] border border-lagoon bg-white p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        start(async () => {
          const r = await recordDeal(fd)
          if (r.error) return toast('error', r.error)
          toast('success', r.message || 'Deal recorded.')
          setOpen(false)
          router.refresh()
        })
      }}
    >
      <div>
        <h2 className="font-sans text-[1.05rem] font-semibold tracking-normal">Record a deal</h2>
        <p className="mt-0.5 text-sm text-muted">When a property is sold or let, record it here. Marking it complete credits the promoter’s wallet ({split.promoter}% of the agency fee) and emails them.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 sm:col-span-2"><span className="field-label !mb-0">Property</span>
          <select name="property" required className="input" defaultValue="" onChange={(e) => {
            const p = properties.find((x) => x.id === e.target.value)
            if (p?.price && !amount) setAmount(String(p.price))
          }}>
            <option value="" disabled>Choose the property…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Promoter who brought the client <span className="font-normal text-muted">(optional)</span></span>
          <select name="promoter" className="input" value={promoter} onChange={(e) => setPromoter(e.target.value)}>
            <option value="">No promoter (direct)</option>
            {promoters.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Deal</span>
          <select name="transactionType" className="input" defaultValue="sale"><option value="sale">Sale</option><option value="rent">Rent</option><option value="lease">Lease</option></select>
        </label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Deal amount (₦)</span>
          <input name="amount" type="number" min={1} required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Agency fee (₦)</span>
          <input name="agencyFee" type="number" min={0} className="input" value={fee} onChange={(e) => setFee(e.target.value)} placeholder={amount ? String(Math.round(Number(amount) * 0.1)) : '10% of the amount'} />
          <span className="field-hint">Leave blank for 10% of the deal amount.</span>
        </label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Buyer or tenant</span><input name="buyerName" className="input" /></label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Their phone or email <span className="font-normal text-muted">(optional)</span></span><input name="buyerPhone" className="input" /></label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Payment reference <span className="font-normal text-muted">(optional)</span></span><input name="reference" className="input" /></label>
        <label className="grid gap-1.5"><span className="field-label !mb-0">Date</span><input name="date" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className="grid gap-1.5 sm:col-span-2"><span className="field-label !mb-0">Notes <span className="font-normal text-muted">(optional)</span></span><input name="notes" className="input" /></label>
      </div>
      <div className="grid gap-3 rounded-[var(--radius-md)] bg-paper p-4 text-sm sm:grid-cols-3">
        <p><span className="text-muted">Agency fee</span><br /><strong>₦{feeN.toLocaleString('en-NG')}</strong></p>
        <p><span className="text-muted">Promoter ({promoter ? split.promoter : 0}%)</span><br /><strong>₦{share.toLocaleString('en-NG')}</strong></p>
        <p><span className="text-muted">Owner ({split.owner}%)</span><br /><strong>₦{Math.round((feeN * split.owner) / 100).toLocaleString('en-NG')}</strong></p>
      </div>
      <div className="grid gap-3">
        <label className="flex items-start gap-3 text-[0.95rem] text-ink-2"><input type="radio" name="paymentStatus" value="completed" defaultChecked className="mt-1 accent-[var(--color-lagoon)]" /> <span><strong className="text-ink">Fee received</strong> — complete it and credit the promoter now</span></label>
        <label className="flex items-start gap-3 text-[0.95rem] text-ink-2"><input type="radio" name="paymentStatus" value="pending" className="mt-1 accent-[var(--color-lagoon)]" /> <span><strong className="text-ink">Fee not received yet</strong> — record it as pending</span></label>
        <label className="flex items-start gap-3 text-[0.95rem] text-ink-2"><input type="checkbox" name="markProperty" defaultChecked className="mt-1 size-[18px] accent-[var(--color-lagoon)]" /> Mark the property as sold / rented</label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? <><LoaderCircle className="size-4 animate-spin" /> Saving…</> : 'Record deal'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
      </div>
    </form>
  )
}
