import 'server-only'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { parseEnv } from 'node:util'
import mongoose from 'mongoose'
// Loaded natively by the models below; imported here so they're bundled with the deployment
import 'bcryptjs'
import 'nodemailer'

/**
 * Data layer.
 *
 * The Mongoose models (password hashing, code generators, cashback hooks)
 * and the email templates live in ./legacy as plain CommonJS, unchanged from
 * the Express app. They're loaded with Node's own `require` so they share
 * this process's mongoose instance and module cache (no duplicate model
 * registration during hot reload). next.config.ts ships the folder with
 * every serverless function.
 */
const LEGACY_DIR = path.join(process.cwd(), 'legacy')
const legacyRequire = createRequire(path.join(LEGACY_DIR, 'index.js'))

type Globals = typeof globalThis & {
  __rvEnvLoaded?: boolean
  __rvConn?: Promise<unknown> | null
}
const g = globalThis as Globals

/**
 * Local convenience: if the Express app's .env sits in the parent folder,
 * use it for anything web/.env.local doesn't set. Never needed on Vercel.
 */
function loadParentEnv() {
  if (g.__rvEnvLoaded) return
  g.__rvEnvLoaded = true
  if (process.env.VERCEL) return
  const envPath = path.join(process.cwd(), '..', '.env')
  try {
    if (!fs.existsSync(envPath)) return
    const parsed = parseEnv(fs.readFileSync(envPath, 'utf8'))
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined && v !== undefined) process.env[k] = v
    }
  } catch {}
}
loadParentEnv()

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyModel = any

export { mongoose }

/**
 * Register every model up front: populate() looks models up by name, so a
 * page that populates `property` before anything touched Models.Property
 * would otherwise fail with MissingSchemaError on a cold start.
 */
function registerModels() {
  for (const k of Object.keys(Models) as (keyof typeof Models)[]) void Models[k]
}

export async function db() {
  registerModels()
  if (mongoose.connection.readyState === 1) return mongoose
  if (!g.__rvConn) {
    const uri = process.env.MONGODB_URI
    if (!uri && process.env.NODE_ENV === 'production') throw new Error('MONGODB_URI is not set')
    g.__rvConn = mongoose
      .connect(uri || 'mongodb://localhost:27017/revaampap', {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        // Serverless: keep the pool small, one per warm function instance
        maxPoolSize: 10,
      })
      .catch((err: unknown) => {
        g.__rvConn = null
        throw err
      })
  }
  await g.__rvConn
  return mongoose
}

function model(name: string): AnyModel {
  return legacyRequire(`./models/${name}.js`)
}

/** Lazily-required models. Call `await db()` before querying. */
export const Models = {
  get User() { return model('User') },
  get Property() { return model('Property') },
  get Hotel() { return model('Hotel') },
  get Blog() { return model('Blog') },
  get Inquiry() { return model('Inquiry') },
  get Transaction() { return model('Transaction') },
  get Solicitor() { return model('Solicitor') },
  get HectareSolicitor() { return model('HectareSolicitor') },
  get Architect() { return model('Architect') },
  get PartnerHotel() { return model('PartnerHotel') },
  get VoucherSubscriber() { return model('VoucherSubscriber') },
  get RoomVoucherReservation() { return model('RoomVoucherReservation') },
  get Promotion() { return model('Promotion') },
  get Interest() { return model('Interest') },
  get Referral() { return model('Referral') },
  // The file is lower-case on disk (app.js required 'ReferralClick', which only worked on macOS)
  get ReferralClick() { return model('referralClick') },
  get Click() { return model('Click') },
  get ClickTracking() { return model('ClickTracking') },
  get ShareTracking() { return model('ShareTracking') },
  get HotelClick() { return model('HotelClick') },
  get HotelBooking() { return model('HotelBooking') },
  get HotelPartner() { return model('HotelPartner') },
  get PropertyIntroduction() { return model('PropertyIntroduction') },
  get BuyerIntroduction() { return model('BuyerIntroduction') },
  get Withdrawal() { return model('Withdrawal') },
  get Bid() { return model('Bid') },
  get BidNotice() { return model('BidNotice') },
  get Project() { return model('Project') },
  get Cooperative() { return model('Cooperative') },
  get StructuralAssessment() { return model('StructuralAssessment') },
}

type EmailService = Record<string, ((...args: any[]) => Promise<unknown>) | undefined>

/** Fire an email template from legacy/utils/email.js; never let a mail failure break the request. */
export async function sendLegacyEmail(fn: string, ...args: unknown[]): Promise<boolean> {
  try {
    const svc = legacyRequire('./utils/email.js') as EmailService
    const send = svc[fn]
    if (typeof send === 'function') return !!(await send(...args))
  } catch (err) {
    console.error(`[email] ${fn} failed:`, (err as Error).message)
  }
  return false
}
