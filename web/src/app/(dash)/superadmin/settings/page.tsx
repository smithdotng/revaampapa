import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { SITE } from '@/lib/site'
import { DashHeader, Panel, KeyValue } from '@/components/dash/ui'

export const metadata: Metadata = { title: 'Platform settings' }

const pct = (k: string, d: number) => {
  const n = Number(process.env[k])
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : d
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-1 size-2.5 shrink-0 rounded-full ${ok ? 'bg-ok' : 'bg-roof'}`} aria-hidden />
      <span><span className="font-semibold text-ink">{label}</span> <span className="text-ink-2">— {ok ? 'set up' : 'not set'}</span><br /><span className="text-sm text-muted">{hint}</span></span>
    </li>
  )
}

export default async function Settings() {
  await requireAdmin()
  const promoter = pct('PROMOTER_COMMISSION', 70)
  const owner = pct('OWNER_COMMISSION', 10)
  return (
    <>
      <DashHeader title="Platform settings" intro="How fees are split, and whether the services the site depends on are connected." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Agency fee split" intro="Applied when you record a completed deal under Transactions.">
          <KeyValue items={[
            ['Promoter', `${promoter}%`],
            ['Property owner', `${owner}%`],
            ['Platform', `${Math.max(0, 100 - promoter - owner)}%`],
            ['Verification fee', '₦20,000 per listing'],
            ['Business partner fee', '₦20,000 one-off'],
          ]} />
          <p className="mt-4 text-sm text-muted">To change the split, set <code className="rounded bg-mist px-1">PROMOTER_COMMISSION</code> and <code className="rounded bg-mist px-1">OWNER_COMMISSION</code> in the Vercel project’s environment variables, then redeploy. Past deals keep the split they were recorded with.</p>
        </Panel>
        <Panel title="Services">
          <ul className="grid gap-4">
            <Check ok={!!process.env.MONGODB_URI} label="Database" hint="MONGODB_URI — your MongoDB Atlas connection string." />
            <Check ok={!!process.env.SESSION_SECRET} label="Sign-in sessions" hint="SESSION_SECRET — keep it the same as the old site so nobody is signed out." />
            <Check ok={!!(process.env.EMAIL_USER && process.env.EMAIL_PASS)} label="Email" hint="EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS — Hostinger SMTP." />
            <Check ok={!!process.env.BLOB_READ_WRITE_TOKEN} label="File uploads" hint="Connect a Vercel Blob store to the project; Vercel adds BLOB_READ_WRITE_TOKEN." />
            <Check ok={!!process.env.NEXT_PUBLIC_UPLOADS_URL} label="Older photos and documents" hint="NEXT_PUBLIC_UPLOADS_URL — where files uploaded before the move are served from." />
            <Check ok={!!process.env.PAYSTACK_SECRET_KEY} label="Paystack" hint="PAYSTACK_SECRET_KEY — project subscriber plans." />
          </ul>
        </Panel>
        <Panel title="Contact details on the site" intro="Edit these in src/lib/site.ts.">
          <KeyValue items={[
            ['Email', SITE.email],
            ['Phone', SITE.phone],
            ['Address', SITE.address.join(', ')],
            ['Site address', SITE.url],
          ]} />
        </Panel>
      </div>
    </>
  )
}
