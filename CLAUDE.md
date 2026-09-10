# Memory Studio — CLAUDE.md

## Purpose

This file is the primary instruction set for AI coding agents working on the Memory Studio website.

Memory Studio is a premium wedding video/audio guest book service. The website is not a generic e-commerce store and is not a SaaS product. V1 should support the complete service-booking workflow from inquiry through private media delivery while remaining simple enough to operate as a side business with one physical booth.

Read these files before making architectural changes:

1. `CLAUDE.md`
2. `BUSINESS_RULES.md`
3. `ARCHITECTURE.md`
4. `DATABASE.md`
5. `PLAN.md`

If code and documentation disagree, do not silently choose one. Identify the discrepancy and update the implementation and documentation together.

---

## Product Summary

The V1 customer journey is:

```text
Public website
  -> Inquiry
  -> Manual admin review
  -> Admin approval
  -> Temporary date hold
  -> Secure client access
  -> Contract signature
  -> 30% retainer via Stripe
  -> Booking confirmation
  -> Client customization
  -> Remaining balance
  -> Wedding/event
  -> Media upload
  -> Private gallery publication
  -> Client video viewing/download
```

### Important Product Decisions

- Customers cannot instantly book.
- Every inquiry must be manually approved before payment is available.
- The retainer is 30% of the approved booking total.
- The contract must be signed before the retainer can be paid.
- Clients do not create accounts in V1.
- Clients access private booking pages through email-based magic-link sessions.
- Admin users authenticate.
- There is one physical booth in V1.
- One active booth reservation may exist for a given event date.
- Clients can customize names, welcome-screen wording, prompts, signage wording, and notes.
- Clients do not choose booth colors in V1.
- The website is used to privately deliver/download wedding videos.
- Customer media is stored in a private object-storage bucket, not in Postgres and not on Vercel's filesystem.

---

## V1 Technology Stack

Use the following stack unless a documented architectural decision changes it:

- **Framework:** Next.js 16.x, App Router, TypeScript
- **Hosting:** Vercel
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Database:** Supabase Postgres
- **Database access:** Drizzle ORM
- **Admin authentication:** Supabase Auth
- **Payments:** Stripe Checkout Sessions
- **Email:** Resend + React Email
- **Object storage:** Cloudflare R2
- **Forms:** React Hook Form
- **Validation:** Zod
- **Analytics:** Vercel Analytics
- **Monitoring:** Sentry only when the project reaches the monitoring milestone
- **Source control:** GitHub

Do not add another database, authentication provider, queue, cache, CMS, CRM, or storage provider without a concrete V1 requirement.

Prefer the project's locked dependency versions. Do not perform major-version upgrades as part of unrelated work.

---

## Non-Negotiable Engineering Rules

### 1. Inquiry is not a booking

Submitting an inquiry does not reserve a date.

Only an admin action can convert an inquiry into a proposed booking and attempt to place a temporary hold.

### 2. Approval is not confirmation

Admin approval creates a temporary date hold.

A booking becomes confirmed only after the required contract is signed and Stripe reports successful payment of the required retainer.

### 3. One booth means one exclusive active date reservation

The database must protect event-date exclusivity.

Do not rely on:
- calendar UI state,
- disabled buttons,
- client-side checks,
- admin memory.

Use a database-backed reservation mechanism and a transaction when creating or confirming a hold.

### 4. Contracts come before payment

A deposit Checkout Session must not be created unless:
- the booking is in a valid hold state,
- the date hold has not expired,
- the current contract is signed,
- the deposit has not already been fully paid.

### 5. The retainer is 30%

Calculate the required retainer on the server:

```text
retainer = round(booking total * 0.30 to nearest cent)
```

All money is stored as integer cents.

Never trust a price, total, discount, deposit, or balance supplied by the browser.

### 6. Stripe webhooks are the payment source of truth

Never mark a payment paid because the client reached a success page.

The Stripe webhook handler must:
- verify the webhook signature,
- process events idempotently,
- use Stripe metadata to identify the internal booking/payment,
- update payment state in a transaction where appropriate.

Store processed Stripe event IDs to prevent duplicate side effects.

### 7. Historical pricing is immutable

Current package/add-on prices may change.

Existing bookings retain a snapshot of the line-item description, quantity, and unit price that was approved for that booking.

Do not calculate historical booking totals from today's pricing configuration.

### 8. Price/scope changes can invalidate a contract

If a signed booking is changed in a way that materially changes price or service scope:
- preserve the old contract,
- mark it superseded when appropriate,
- create a new contract snapshot,
- require the current contract to be signed before collecting newly required payment.

Never mutate signed contract content in place.

### 9. Clients do not have V1 accounts

Do not introduce customer passwords.

Client access is:
1. client requests/receives a one-time magic link by email,
2. server verifies a hashed token,
3. server creates a secure client session,
4. client uses an HTTP-only cookie.

Do not store raw magic-link or session tokens in the database.

### 10. Admins authenticate separately

Only authenticated, authorized admin users can access `/admin`.

Authentication alone is not authorization. Verify the authenticated user is permitted to administer Memory Studio.

### 11. Media never travels through a normal Vercel Function body

Wedding videos can be much larger than serverless request/response payload limits.

For browser uploads:
- authenticate/authorize the request,
- create a short-lived presigned R2 `PUT` URL on the server,
- upload directly from the browser to R2.

For downloads:
- authorize the client against the booking,
- create a short-lived presigned R2 `GET` URL,
- download directly from R2.

Never store R2 credentials in client code.

### 12. The R2 media bucket is private

Do not make customer media publicly enumerable or permanently public.

Presigned URLs are bearer credentials. Keep expirations short and only issue them after authorization.

### 13. Do not store media blobs in Postgres

Postgres stores metadata such as:
- object key,
- filename,
- MIME type,
- byte size,
- duration,
- visibility,
- media type.

The video bytes live in object storage.

### 14. Business logic belongs on the server

React components should not own booking rules.

Use a service layer for workflows such as:
- `approveInquiry()`
- `expireHold()`
- `signContract()`
- `createDepositCheckoutSession()`
- `applyStripePaymentEvent()`
- `updateCustomization()`
- `publishGallery()`
- `createMediaUploadUrl()`
- `createMediaDownloadUrl()`

### 15. Validate all external input

Use Zod for:
- forms,
- route handlers,
- server actions,
- URL parameters where appropriate,
- Stripe metadata before using it as an internal identifier,
- admin mutations.

### 16. Favor transactions for multi-record state changes

Examples:
- approving an inquiry and reserving a date,
- converting a paid hold to confirmed,
- superseding a contract and creating its replacement,
- recording a payment and updating derived booking state.

### 17. Do not build features before their milestone

Do not prematurely add:
- multiple-booth scheduling,
- customer password accounts,
- SMS,
- automated video transcoding,
- vendor portals,
- CRM integrations,
- complex installment plans,
- coupon systems,
- automated editing,
- a CMS,
- a queue,
- Redis.

---

## Security Requirements

- Secrets are server-only environment variables.
- Never use `NEXT_PUBLIC_` for server credentials.
- Never log:
  - Stripe secrets,
  - R2 secrets,
  - Supabase service-role keys,
  - raw magic-link tokens,
  - raw client session tokens.
- Hash magic-link/session tokens before persistence.
- Use HTTPS-only, HTTP-only, `SameSite=Lax` or stricter session cookies in production.
- Check authorization on every private server operation.
- Do not rely on hidden UI elements for security.
- Sanitize or safely render client-entered text.
- Rate-limit abuse-prone endpoints when the project reaches public launch readiness, especially:
  - inquiry submission,
  - request-magic-link,
  - magic-link redemption,
  - presigned-upload creation.
- Treat customer videos as private personal content.
- Do not include customer video URLs in analytics events.

---

## Suggested Project Structure

```text
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── packages/
│   │   ├── how-it-works/
│   │   ├── gallery/
│   │   └── faq/
│   ├── inquiry/
│   ├── access/
│   │   └── [token]/
│   ├── client/
│   │   ├── page.tsx
│   │   ├── contract/
│   │   ├── payment/
│   │   ├── customize/
│   │   └── gallery/
│   ├── admin/
│   │   ├── inquiries/
│   │   ├── bookings/
│   │   ├── calendar/
│   │   └── media/
│   └── api/
│       ├── stripe/
│       │   └── webhook/
│       └── media/
├── components/
├── features/
│   ├── inquiries/
│   ├── bookings/
│   ├── contracts/
│   ├── payments/
│   ├── customization/
│   └── media/
├── server/
│   ├── services/
│   ├── repositories/
│   └── auth/
├── lib/
│   ├── db/
│   ├── stripe/
│   ├── r2/
│   ├── email/
│   └── validation/
└── config/
    └── pricing.ts
```

Keep feature-specific UI near its feature when that improves maintainability. Avoid giant `utils.ts`, `actions.ts`, or `page.tsx` files.

---

## Coding Conventions

- TypeScript strict mode.
- Prefer descriptive domain names over generic names.
- Prefer small pure functions for calculations.
- Keep money helpers centralized.
- Keep authorization helpers centralized.
- Use UTC timestamps in persistence; render in the applicable local timezone.
- Store an event's timezone explicitly if the business expands beyond a single local market.
- Use database-generated UUIDs for internal identifiers.
- Do not expose sequential internal identifiers publicly.
- Keep user-facing status text separate from persisted enum values.
- Handle empty/loading/error/success states for all remote operations.
- Use accessible labels and keyboard-friendly form controls.
- Do not create custom UI primitives when shadcn/ui already provides a suitable accessible base.

---

## Pricing Configuration

Initial package pricing may be represented in `src/config/pricing.ts` until a database-backed admin catalog is justified.

Initial regular package targets:

```text
Moment     $499
Signature  $699
Keepsake   $949
```

Initial add-on targets may include:

```text
Additional rental hour         $100
Edited keepsake film           $200–$250
Booth attendant                ~$75/hour
Premium backdrop               $150–$250
Custom signage                 ~$75
Animated welcome screen        ~$75
Rush delivery                  ~$150
Second kiosk                   future
Extended cloud archive         ~$50
Anniversary video edit         $150–$250
```

These are business configuration values, not immutable system constants.

When an inquiry becomes a booking, copy approved line items into `booking_line_items`.

---

## Testing Expectations

At minimum, write automated tests for business-critical calculations and state transitions.

Priority tests:

1. 30% retainer calculation.
2. Remaining balance calculation.
3. Cannot create payment session before current contract is signed.
4. Cannot confirm a booking from a browser success redirect.
5. Stripe webhook duplicate delivery does not double-record payment.
6. Two concurrent approvals cannot reserve the same date.
7. Expired hold cannot create a deposit Checkout Session.
8. Historical line items do not change when current pricing changes.
9. Client cannot access another booking's media.
10. Admin-only endpoints reject non-admin users.
11. Superseded contract is not accepted as the current signed contract.
12. Presigned upload/download requests require authorization.

Add integration/end-to-end tests as the associated milestone is implemented.

---

## Environment Variable Naming

Exact values must never be committed.

Expected categories:

```text
DATABASE_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=
EMAIL_FROM=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

APP_URL=
CLIENT_SESSION_SECRET=
```

Only expose a value to the browser if the provider explicitly intends it to be public.

---

## Change Discipline

Before a substantial implementation change:

1. Identify the relevant milestone in `PLAN.md`.
2. Read the applicable rules in `BUSINESS_RULES.md`.
3. Check the data model in `DATABASE.md`.
4. Check boundaries in `ARCHITECTURE.md`.
5. Implement the smallest complete slice.
6. Add/update tests.
7. Update documentation if behavior changed.

When proposing a new dependency, explain:
- what problem it solves,
- why existing stack pieces cannot solve it adequately,
- operational cost,
- vendor lock-in,
- whether it is V1-critical.

---

## Definition of V1 Success

V1 is complete when a real customer can move through this path reliably:

```text
website
-> inquiry
-> manual approval
-> temporary hold
-> private client access
-> contract signature
-> 30% Stripe retainer
-> confirmed booking
-> customization
-> remaining balance
-> event
-> private media gallery
-> video download
```

Do not measure V1 completion by number of features. Measure it by whether this workflow works reliably for a real paid wedding.
