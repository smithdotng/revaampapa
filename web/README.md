# RevaampAPA — Next.js

revaampapa.com — the public site, sign-in and registration, all nine account
dashboards and the superadmin panel — in Next.js 16 (App Router, React 19,
Tailwind 4). It runs on its own and deploys to Vercel; the Express app in the
parent folder is no longer needed to serve the site.

## How it's put together

| Concern | How it works |
| --- | --- |
| **Data** | The Mongoose models (password hashing, subscriber codes, cashback hooks) live in `legacy/models`, copied from the Express app, and load through `src/lib/legacy.ts`. Same MongoDB database, no migration. |
| **Sessions** | `src/lib/session.ts` reads and writes the same `express-session` + `connect-mongo` sessions (cookie `connect.sid`, `sessions` collection). Keep `SESSION_SECRET` the same and nobody is signed out by the switch. |
| **Uploads** | On Vercel the browser uploads files straight to **Vercel Blob** (`/api/uploads`, `src/lib/upload-client.ts`), because Vercel rejects requests over 4.5MB. Records store the Blob URL. Locally, without a Blob store, files are written to `../public/uploads`. Older records keep their `/uploads/...` paths and are served from `NEXT_PUBLIC_UPLOADS_URL`. |
| **Email** | Hostinger SMTP via Nodemailer (`src/lib/mail.ts`, templates in `legacy/utils/email.js`). |
| **Payments** | Paystack for project subscriber plans; bank transfer + receipt upload for verification and partner fees. |

## What's here

**Public:** home, properties, hotels (with Room Voucher cashback), blog,
projects, how it works, about, contact, join, terms / privacy / cookies, sign
in / out, forgot / reset password, registration for all nine roles, tracking
links (`/r/:code`, `/referral/track/:code`, `/hotels/track/:hotelId/:code`),
`/verification-callback`, and the old JSON endpoints (`/api/stats`,
`/api/properties/featured|recent`, `/api/inquiries`, `/api/contact`, `/api/subscribe`).

**Dashboards** (`src/app/(dash)`):

| Account | Pages |
| --- | --- |
| Property owner `/property-owner` | overview, add / edit / delete property, pay verification fee, enquiries (reply, notes, archive), earnings, settings |
| Promoter `/promoter`, business partner `/business-partner` | overview, tracked property and hotel links, introduce a property / buyer / hotel, leads, activity, earnings + withdrawals, settings; partners also bid on bid notices |
| Project subscriber `/project-subscriber` | projects (milestones, updates, financials), bank guarantee, subscription (Paystack), settings |
| Partner solicitor `/solicitor`, HbH solicitor `/hectare-solicitor`, architect `/architect` | overview, KPIs / cooperatives / structural assessments, settings |
| Room Voucher `/voucher` | overview, reservations, settings |
| **Superadmin** `/superadmin` | overview with everything waiting on you; analytics; enquiries (bulk actions, reply, notes, CSV export); properties (verify, send back, feature, list for an offline owner, edit, delete); hotels (add / edit / photos / feature / hide); partner hotel applications; blog; promoters; business partners (confirm payments); property owners; professionals (architects, solicitors, HbH); project subscribers and projects; Room Voucher subscribers and stays (cashback); transactions (record deals, credit commission); withdrawals; bid notices (allocate lots); profile; platform settings |

## Deploy to Vercel

1. **Import the repo** in Vercel and set **Root Directory** to `web`. The
   framework (Next.js) and build command are detected automatically.
2. **Storage → Create → Blob**, and connect it to the project. This adds
   `BLOB_READ_WRITE_TOKEN`.
3. **Environment variables** (Settings → Environment Variables), from `.env.example`:
   `MONGODB_URI`, `SESSION_SECRET` (same as the old site), `BASE_URL`,
   `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `PAYSTACK_SECRET_KEY`.
4. **MongoDB Atlas → Network Access**: allow `0.0.0.0/0`. Vercel doesn't
   use fixed IP addresses.
5. **Functions region** (Settings → Functions): pick the one closest to your
   Atlas cluster, so every page isn't waiting on a round trip across the world.
6. **Deploy**, then sign in as superadmin on the `*.vercel.app` address and
   check **Platform settings**. Every service should show as set up.
7. **Move the old uploads** so existing photos and documents keep working:
   download `public/uploads` from the live server, then from `web/`:

   ```bash
   npm install
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... npm run upload-legacy-files -- /path/to/uploads
   ```

   Set `NEXT_PUBLIC_UPLOADS_URL` to the address it prints, and redeploy.
8. **Point the domain** at Vercel (Settings → Domains). The old server can be
   switched off once DNS has moved.

## Run locally

```bash
cd web
cp .env.example .env.local   # or rely on ../.env from the Express app
npm install
npm run dev                  # http://localhost:3001
```

## Changes from the old site worth knowing

- **Emails are unique across all account types.** Registration now checks every
  collection the login form searches (User, Solicitor, HectareSolicitor,
  Architect, PartnerHotel, VoucherSubscriber); before, a second account with the
  same email could never sign in.
- **Pending accounts don't get a session.** Promoters awaiting approval,
  unverified business partners and unapproved solicitors/architects see a clear
  message instead of being half signed in.
- **Forgot password** no longer reveals whether an email is registered, and now
  also works for architects and Room Voucher subscribers.
- **Partner solicitor years** are a number field (min 10) instead of being parsed
  out of free text. The `experience` field is still written as "12 years — …" so
  the Express code keeps working.
- **Rich text** (property, hotel, blog descriptions) is sanitised before render.
- **Business partner payment details are saved.** The old registration wrote them
  to `promoterProfile.paymentStatus` etc., which aren't in the User schema, so
  Mongoose dropped them and no business partner could ever sign in. They now go
  to `businessPartnerProfile` (where the schema has them), and sign-in checks
  `businessPartnerProfile.paymentStatus`. Superadmin confirms them under
  Business partners.
- **Withdrawals create a `Withdrawal` record.** The old flow only deducted the
  balance, so superadmin's withdrawals page never saw a request.
- **Promoter clicks and leads are tracked.** Shared links go through `/r/:code`;
  an enquiry made after clicking one also creates an `Interest` for the promoter
  and bumps the promotion's counters. Old `?ref=` links are counted too.
- **Referral sign-ups are credited.** Registering via a promoter or partner link
  creates a `Referral` linked to the new account (the old flow ignored `?ref=`).
- **Owners are emailed** when a new enquiry arrives, and their replies are emailed
  to the buyer (before, replies were only saved).
- `ReferralClick` is loaded from `models/referralClick.js`; `app.js` requires
  `ReferralClick`, which fails on a case-sensitive (Linux) server.
- **Partner Hotel copy** no longer promises a dashboard (hotels have no login).
- Homepage stats are **live counts** from the database (hidden below 10), not the
  hard-coded "500+ / 200+" figures. Placeholder testimonials and the
  commented-out leadership team were not carried over.
- **Superadmin can list, edit and remove hotel photos** (including the
  remove-image change that was in progress on the Express app), reply to
  enquiries, add notes, and allocate bid-notice lots with an email to the partner.
- **Platform settings are honest.** The old page "saved" fee splits into
  memory, lost on restart. The split now comes from `PROMOTER_COMMISSION` /
  `OWNER_COMMISSION` environment variables, and the page shows which services
  are connected.
- **Duplicate hotel names** get a unique slug (`-2`, `-3`…) instead of failing
  to save; **blog posts** no longer fail validation before their slug is set.
- **`/projects/:slug`** only ever showed a placeholder, so it now redirects to `/projects`.
- The `/admin` routes, the agent area, shortlet bookings and QR code endpoints
  existed as files but were never mounted in `app.js`, so they weren't carried over.


## To do

- `SITE.phone` in `src/lib/site.ts` is still the placeholder `+234 800 000 0000`.
- The sub-aggregator referral link was left out: `/aggregator/register` doesn't
  exist yet.
- Profile photos: the old `/dashboard/update-profile-image` upload wasn't
  carried over (no page displayed them).
