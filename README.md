# Memory Studio

**🌐 Website: [memorystudiooc.com](https://memorystudiooc.com)**

Memory Studio is a premium wedding video/audio guest book service. This repository is the source for its website and booking platform: a public marketing site, a manually-reviewed inquiry flow, and a private portal that carries a couple from first inquiry through contract, payment, customization, and final video delivery.

It is deliberately **not** a generic e-commerce store or a SaaS product. It is built to be run reliably as a small business with one physical booth.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Key Product Decisions](#key-product-decisions)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Architecture Highlights](#architecture-highlights)
- [Security](#security)
- [Testing](#testing)
- [Documentation](#documentation)
- [Project Status](#project-status)
- [Contributing](#contributing)

---

## How It Works

```text
Public website
  -> Inquiry
  -> Manual admin review
  -> Admin approval
  -> Temporary date hold
  -> Secure client access (email magic link)
  -> Contract signature
  -> 30% retainer via Stripe
  -> Booking confirmation
  -> Client customization
  -> Remaining balance
  -> Wedding / event
  -> Media upload
  -> Private gallery publication
  -> Client video viewing / download
```

| Audience | What they do |
| --- | --- |
| **Visitors** | Browse packages, FAQ, and gallery; submit an inquiry. |
| **Clients** | Open a private booking page via emailed magic link; sign the contract, pay the retainer and balance, customize their booth, and download their videos. |
| **Admin** | Review inquiries, approve bookings and date holds, manage bookings, upload media, and publish galleries. |

## Key Product Decisions

- Customers **cannot instantly book** – every inquiry is manually approved before payment is available.
- Approval creates a **temporary date hold**; a booking is **confirmed** only after the contract is signed *and* Stripe reports the retainer paid.
- The retainer is **30%** of the approved total, calculated on the server. All money is stored as integer cents.
- **One booth**: at most one active reservation per event date, enforced by the database.
- **No client accounts or passwords** in V1 – clients use email magic links and HTTP-only session cookies.
- Clients customize names, welcome-screen wording, prompts, signage wording, and notes (not booth colors).
- Wedding media is stored in a **private** object-storage bucket and delivered with short-lived presigned URLs.

## Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Hosting | Vercel |
| Styling / UI | Tailwind CSS v4, shadcn/ui (Base UI) |
| Database | Supabase Postgres via Drizzle ORM |
| Admin auth | Supabase Auth |
| Payments | Stripe Checkout Sessions + webhooks |
| Email | Resend + React Email |
| Object storage | Cloudflare R2 (S3-compatible, private) |
| Forms / validation | React Hook Form + Zod |
| Analytics | Vercel Analytics |
| Tests | Vitest |

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- A Supabase project (Postgres + Auth)
- Stripe account (test mode is fine for development) and the Stripe CLI for local webhooks
- Resend account
- Cloudflare R2 bucket (private)

### Setup

```bash
git clone https://github.com/Msithiphong/MemoryStudio.git
cd MemoryStudio
npm install

cp .env.example .env.local   # then fill in the values
npx drizzle-kit migrate      # apply database migrations
npm run dev
```

The app runs at <http://localhost:3000>.

To receive Stripe webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET`.

A contract template can be seeded with `scripts/seed-contract-template.ts`. Have the contract text reviewed before real customers sign anything.

## Environment Variables

See [`.env.example`](.env.example). Never commit real values. Server secrets must never use the `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase client config |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase admin key |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe API and webhook verification |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Cloudflare R2 media storage |
| `APP_URL` | Absolute site origin (used in emails and redirects) |
| `CLIENT_SESSION_SECRET` | Secret for client session handling |

Environment variables are validated with Zod in `src/lib/env.ts`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run test` | Run the Vitest suite |

## Project Structure

```text
src/
├── app/
│   ├── (marketing)/   # Home, packages, how-it-works, gallery, FAQ, about, inquiry
│   ├── access/        # Magic-link request & redemption
│   ├── client/        # Private client portal: contract, payment, customize, gallery
│   ├── admin/         # Authenticated admin: inquiries, bookings, media
│   └── api/           # Stripe webhook and other route handlers
├── components/        # Shared UI (shadcn/ui)
├── server/
│   └── services/      # Business logic: bookings, contracts, payments, media, ...
├── lib/               # DB, Stripe, R2, email, env, validation helpers
└── config/            # Pricing configuration
drizzle/               # SQL migrations
scripts/               # One-off scripts (e.g. contract template seeding)
```

## Architecture Highlights

- **Server-side business logic.** Workflows such as approving an inquiry, signing a contract, creating a deposit Checkout Session, applying Stripe events, and issuing media URLs live in the service layer, not in React components.
- **Database-enforced date exclusivity.** Holds and confirmations run in transactions backed by a database constraint, not UI state.
- **Contracts before payment.** A deposit session can only be created when the booking has an unexpired hold and a signed, current contract.
- **Stripe webhooks are the source of truth.** Signatures are verified, processed event IDs are stored for idempotency, and a success-page redirect never marks anything paid.
- **Immutable pricing history.** Approved line items are snapshotted per booking; later price changes never alter existing bookings.
- **Direct-to-R2 media.** Videos never pass through a Vercel Function body; the server only issues short-lived presigned `PUT`/`GET` URLs after authorization.

## Security

- Secrets are server-only; raw magic-link and session tokens are never stored or logged (only hashes).
- Client sessions use HTTP-only, `SameSite` cookies over HTTPS in production.
- Admin access requires both authentication and authorization.
- Every private operation checks authorization server-side; hidden UI is not a control.
- External input is validated with Zod.
- Customer videos are private personal content and are excluded from analytics.

To report a vulnerability, please contact the maintainer privately rather than opening a public issue.

## Testing

```bash
npm run test
```

Automated tests cover the business-critical rules: retainer and balance calculation, contract-before-payment gating, hold expiry, webhook idempotency, concurrent-approval protection, pricing snapshots, and media authorization.

## Documentation

| File | Contents |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Instructions and non-negotiable rules for AI coding agents |
| [`BUSINESS_RULES.md`](BUSINESS_RULES.md) | Numbered business rules |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System boundaries and layering |
| [`DATABASE.md`](DATABASE.md) | Schema, invariants, and transactions |
| [`PLAN.md`](PLAN.md) | Phased build plan |
| [`HANDOFF.md`](HANDOFF.md) | Notes from earlier development phases |

If code and documentation disagree, update both together.

## Project Status

Implemented through the V1 workflow: marketing site, inquiry system, admin dashboard, booking approval and date holds, passwordless client access, contracts, Stripe 30% retainer, client customization, remaining balance, and private R2 media upload. See [`PLAN.md`](PLAN.md) for remaining phases (gallery publication, download delivery, and launch readiness).

## Contributing

This is a private business project. If you are collaborating on it:

1. Read `CLAUDE.md` and the documents above first.
2. Work in small vertical slices and add tests for business rules.
3. Run `npm run lint && npm run typecheck && npm run test && npm run build` before pushing.
4. Do not add new infrastructure (queues, caches, CMS, other databases) without a concrete V1 requirement.

---

© Memory Studio. All rights reserved.
