import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
let transporter: Transporter | null | undefined

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return (transporter = null)
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
  })
  return transporter
}

/** Same Hostinger SMTP setup as the Express app. Returns false if mail isn't configured. */
export async function sendMail(to: string, subject: string, html: string, replyTo?: string) {
  const t = getTransporter()
  if (!t) {
    console.log(`[mail:dev] to=${to} subject=${subject}`)
    return false
  }
  await t.sendMail({ from: `"RevaampAPA" <${process.env.EMAIL_USER}>`, to, subject, html, replyTo })
  return true
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function emailShell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f2f5f4;font-family:Arial,Helvetica,sans-serif;color:#1e2326">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#0f3b3b;color:#fff;padding:22px 28px;border-radius:14px 14px 0 0;font-size:18px;font-weight:bold">${title}</div>
    <div style="background:#fff;padding:28px;border-radius:0 0 14px 14px;line-height:1.6;font-size:15px">${body}</div>
    <p style="font-size:12px;color:#6b7774;text-align:center;margin-top:18px">RevaampAPA · Aggregation, Promotions &amp; Agency Platform</p>
  </div></body></html>`
}
