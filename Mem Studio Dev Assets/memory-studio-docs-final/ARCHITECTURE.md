# Memory Studio — Architecture

## 1. Overview

Memory Studio V1 is an approval-based service-booking and private media-delivery application for a wedding video/audio guest book business.

It consists of three user-facing areas:

1. **Public marketing website**
2. **Private client area**
3. **Authenticated admin area**

The application uses Next.js on Vercel for the web application, Supabase Postgres for durable business data, Stripe for payments, Resend for transactional email, and Cloudflare R2 for private media storage.

---

## 2. Architectural Goals

V1 prioritizes:

- simple customer experience,
- manual control over which events are accepted,
- prevention of double booking,
- reliable payment state,
- private customer media,
- low operating complexity,
- low startup cost,
- clear business-domain boundaries,
- an architecture that can later support additional booths and event types.

V1 does **not** optimize for:

- large multi-tenant scale,
- multiple locations,
- hundreds of concurrent admins,
- automated video processing,
- sophisticated CRM workflows,
- real-time collaboration.

---

## 3. System Context

```text
                            ┌─────────────────────┐
                            │      Customer       │
                            └──────────┬──────────┘
                                       │
                                       ▼
                         ┌──────────────────────────┐
                         │   Next.js on Vercel      │
                         │                          │
                         │ Public / Client / Admin  │
                         └───────┬──────┬──────┬───┘
                                 │      │      │
                 ┌───────────────┘      │      └──────────────┐
                 ▼                      ▼                     ▼
        ┌────────────────┐      ┌──────────────┐      ┌───────────────┐
        │ Supabase       │      │   Stripe     │      │ Cloudflare R2 │
        │ Postgres/Auth  │      │   Checkout   │      │ Private Media │
        └────────────────┘      └──────────────┘      └───────────────┘
                 │
                 ▼
        ┌────────────────┐
        │     Resend     │
        │ Transactional  │
        │     Email      │
        └────────────────┘
```

---

## 4. Application Areas

### 4.1 Public Website

Primary routes:

```text
/
 /how-it-works
 /packages
 /gallery
 /faq
 /about
 /inquiry
```

Responsibilities:

- explain the emotional value of the service,
- present packages and add-ons,
- build trust,
- show approved portfolio media,
- collect inquiries.

The public site never reserves a date and never creates a Stripe Checkout Session.

### 4.2 Client Area

Primary routes:

```text
/access/[token]
/client
/client/contract
/client/payment
/client/customize
/client/gallery
```

Responsibilities:

- redeem one-time magic links,
- show booking status,
- sign the current contract,
- pay the required retainer/final balance,
- submit/edit permitted customization,
- access published wedding media.

Clients do not use passwords in V1.

### 4.3 Admin Area

Primary routes:

```text
/admin
/admin/inquiries
/admin/inquiries/[id]
/admin/bookings
/admin/bookings/[id]
/admin/calendar
/admin/media
```

Responsibilities:

- review inquiries,
- approve/waitlist/decline inquiries,
- create date holds,
- configure approved booking line items,
- monitor contracts/payments,
- lock customization,
- upload/publish media,
- manage booking lifecycle.

Admin access requires Supabase Auth plus application authorization.

---

## 5. Domain Modules

Organize server-side domain logic around these modules.

### Inquiry

Responsibilities:
- submit,
- review,
- waitlist,
- decline,
- convert to booking.

### Availability

Responsibilities:
- determine whether a date is available,
- create a hold,
- expire a hold,
- confirm a held date,
- release a reservation after cancellation if allowed.

### Booking

Responsibilities:
- create booking snapshot,
- calculate totals,
- calculate required retainer,
- calculate outstanding balance,
- manage booking status.

### Contract

Responsibilities:
- create contract snapshot,
- track version,
- sign current contract,
- preserve signature evidence,
- supersede old contracts.

### Payment

Responsibilities:
- create Stripe Checkout Sessions,
- validate payment eligibility,
- consume Stripe webhooks,
- record payment/refund events,
- derive paid/outstanding amounts.

### Client Access

Responsibilities:
- issue magic links,
- redeem one-time tokens,
- create/revoke client sessions,
- authorize access to one booking.

### Customization

Responsibilities:
- save names/welcome wording/signage wording/notes,
- manage prompt list,
- enforce deadline/lock.

### Media

Responsibilities:
- create R2 object keys,
- issue presigned upload URLs,
- record object metadata,
- publish/unpublish assets,
- issue authorized presigned download URLs.

### Email

Responsibilities:
- inquiry received,
- approval/hold,
- magic access,
- retainer confirmation,
- balance reminders,
- customization reminders,
- gallery published.

---

## 6. Layering

Use a light layered architecture.

```text
UI / Route
   ↓
Validation + Authorization
   ↓
Domain Service
   ↓
Repository / External Gateway
   ↓
Database / Stripe / R2 / Resend
```

### UI / Routes

Responsible for:
- rendering,
- collecting input,
- calling server operations,
- displaying safe errors.

Not responsible for:
- calculating trusted prices,
- authorizing access,
- booking-state transitions,
- payment truth.

### Domain Services

Responsible for business rules and multi-step workflows.

Examples:

```text
approveInquiry()
signContract()
createDepositCheckoutSession()
applyStripeWebhook()
publishGallery()
```

### Repositories

Responsible for data persistence and queries.

Examples:

```text
InquiryRepository
BookingRepository
ContractRepository
PaymentRepository
MediaRepository
```

Avoid leaking Drizzle-specific query details throughout the UI.

### External Gateways

Wrap vendor SDK operations where useful:

```text
StripeGateway
R2Gateway
EmailGateway
```

This keeps vendor-specific code from spreading through business logic.

---

## 7. Booking Lifecycle

### 7.1 Inquiry

```text
new
  ├─> reviewing
  ├─> waitlisted
  ├─> declined
  └─> converted
```

The admin action labeled **Approve**:
1. checks availability,
2. creates an approved booking snapshot,
3. attempts to reserve the event date,
4. marks the inquiry converted only if the operation succeeds,
5. creates/sends client access.

### 7.2 Booking

```text
hold
  ├─> confirmed
  ├─> expired
  └─> cancelled

confirmed
  ├─> completed
  └─> cancelled
```

`confirmed` occurs only after the required retainer is confirmed through Stripe webhook processing.

---

## 8. Exclusive Date Reservation Design

Because V1 has one physical booth, event-date availability is an inventory problem.

Use a dedicated `date_reservations` table:

```text
event_date UNIQUE
booking_id UNIQUE
status = hold | confirmed
hold_expires_at nullable
```

### Approval Transaction

Pseudocode:

```text
BEGIN

expire stale reservation for target date if applicable

assert no active reservation exists for target date

create booking
create booking line-item snapshots
create date reservation(status=hold, hold_expires_at=...)
mark inquiry converted

COMMIT
```

The unique constraint on `event_date` provides a final concurrency barrier.

### Retainer Confirmation Transaction

```text
BEGIN

record Stripe payment idempotently
verify reservation still belongs to booking
change reservation hold -> confirmed
change booking hold -> confirmed

COMMIT
```

A stale or conflicting booking must not become confirmed silently.

### Hold Duration

Hold duration is a configurable business setting.

Recommended launch default: **72 hours**.

Final business value: **TBD before launch**.

---

## 9. Payment Architecture

Use Stripe Checkout Sessions.

### Deposit Creation

Client requests to pay deposit.

Server:

1. authenticates client session,
2. loads booking,
3. confirms hold is active,
4. confirms current contract is signed,
5. calculates total from stored line items,
6. calculates 30% retainer,
7. subtracts any already-paid deposit amount,
8. creates or reuses an eligible Stripe Checkout Session,
9. includes internal identifiers in Stripe metadata.

The browser never submits the trusted amount.

### Payment Completion

```text
Stripe
  -> POST /api/stripe/webhook
  -> verify signature
  -> reject/ignore already processed event ID
  -> validate metadata
  -> record payment
  -> update booking/reservation when rules are satisfied
```

The success page is informational only.

### Final Balance

V1 may use a second Stripe Checkout Session.

The data model should allow a later switch to Stripe Invoicing without redesigning booking/payment records.

---

## 10. Client Access Architecture

Clients have no user account.

### Request Flow

```text
Client email
  -> request access
  -> server returns generic success response
  -> server emails one-time magic link if eligible
```

Do not reveal whether an email/booking exists.

### Magic Link

Generate a high-entropy random token.

Persist:

```text
token_hash
booking_id
expires_at
used_at
```

Email the raw token only in the link.

### Redemption

```text
/access/[token]
  -> hash presented token
  -> find unused, unexpired record
  -> mark token used
  -> create client session
  -> set secure HTTP-only cookie
  -> redirect /client
```

### Client Session

Persist only a hash:

```text
session_hash
booking_id
expires_at
revoked_at
last_seen_at
```

Recommended launch session lifetime: **30 days**, renewable through another magic link.

Final session lifetime: configurable.

---

## 11. Contract Architecture

Contracts are snapshots.

A contract record should contain:

- template version,
- rendered contract content,
- content hash,
- booking total snapshot,
- signed legal name,
- acceptance flag,
- signed timestamp,
- IP address,
- user agent.

Never update a signed contract's content.

If a new signature is required:
1. preserve old record,
2. create a new contract record,
3. mark the old one superseded,
4. require the newest contract to be signed.

A California attorney should review the final legal language and electronic-signature workflow before commercial launch.

---

## 12. Media Architecture

### Storage Boundary

Postgres stores metadata.

Cloudflare R2 stores file bytes.

Vercel routes authorize requests but should not proxy large wedding media.

### Upload

```text
Admin browser
  -> request upload authorization
  -> Next.js verifies admin
  -> server generates R2 object key + short-lived presigned PUT
  -> browser uploads directly to R2
  -> browser/server confirms metadata
  -> database media record created/updated
```

Use a server-generated object key such as:

```text
bookings/{bookingUuid}/original/{mediaUuid}.{ext}
bookings/{bookingUuid}/web/{mediaUuid}.mp4
bookings/{bookingUuid}/delivery/{archiveUuid}.zip
```

Never derive security from obscurity of object keys.

### Download

```text
Client
  -> requests asset
  -> server validates client session
  -> server validates asset belongs to client's booking
  -> server validates asset is visible/downloadable
  -> server creates short-lived presigned GET
  -> client downloads directly from R2
```

Do not store presigned URLs in the database.

### Video Format

V1 may manually create browser-friendly H.264 MP4 versions before upload.

The database should distinguish:
- original,
- web playback,
- highlight,
- full delivery archive.

Automated transcoding is out of scope for V1.

---

## 13. Email Architecture

Use Resend for transactional email.

Templates should be version-controlled React Email components.

Initial templates:

```text
inquiry-received
inquiry-approved
waitlist-notice
decline-notice
client-access
retainer-paid
balance-due
customization-reminder
gallery-published
```

Email delivery failure should be recorded/logged but should not corrupt booking state.

Payment confirmation must not depend on email succeeding.

---

## 14. Data Ownership and Privacy

Customer-entered booking information and wedding recordings are private business/customer data.

Rules:

- no public R2 bucket for customer delivery,
- no permanent signed media URLs,
- no cross-booking client queries,
- no raw video content in analytics,
- separate event-host delivery consent from optional marketing/media-release consent,
- media approved for public portfolio use should have explicit release state in the database.

The media-release model can be expanded after the core delivery workflow works.

---

## 15. Failure Handling

### Stripe webhook repeated

Expected. Process idempotently.

### Email fails

Keep booking state; log and allow resend.

### Hold expires while client is on payment page

Do not create a new Checkout Session after expiration.

If Stripe later reports a successful payment for an expired/conflicting hold, flag for manual review instead of automatically double-booking a date.

### Upload interrupted

The R2 object/DB metadata flow should allow retry without creating duplicate visible gallery items.

### Client loses access

Issue a new one-time magic link.

### R2 unavailable

Show a recoverable error; do not mark files deleted.

---

## 16. Deployment Environments

Use at least:

```text
local
preview
production
```

Prefer separate Stripe test mode and production secrets.

Do not let Vercel Preview deployments mutate production booking/payment/media data unless explicitly intended.

Recommended:
- preview/test database,
- test Stripe credentials,
- non-production email behavior,
- separate R2 test bucket or isolated prefix.

---

## 17. Observability

V1:
- structured server logs,
- Vercel logs,
- Stripe Dashboard/webhook logs,
- database timestamps/statuses.

Later:
- Sentry,
- explicit operational alerts,
- richer audit log.

Do not log secrets or raw access tokens.

---

## 18. Current External Constraints

At the time this architecture was written:

- Next.js 16.x is the active supported production major.
- Vercel Functions enforce request/response payload limits that make ordinary serverless proxying inappropriate for large wedding videos.
- Stripe recommends Checkout Sessions for most payment integrations.
- Cloudflare R2 supports presigned `PUT` and `GET` URLs for direct private uploads/downloads.

These external constraints should be re-verified when implementation reaches the relevant milestone rather than assumed forever.

---

## 19. Future Expansion Paths

The architecture should be able to grow toward:

- multiple booths/resources,
- non-wedding event types,
- event inventory by booth rather than by date,
- client accounts if genuinely needed,
- automated media transcoding,
- vendor referrals,
- richer contracts/change orders,
- installment plans,
- SMS,
- CRM integration,
- event-memory products beyond video guest books.

Do not implement these until validated demand justifies them.


---

## 20. Reference Documentation

Useful implementation references to re-check at the relevant milestone:

- Next.js support policy: https://nextjs.org/support-policy
- Next.js releases: https://nextjs.org/blog
- Stripe Checkout Sessions: https://docs.stripe.com/payments/checkout-sessions
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Vercel function payload limits: https://vercel.com/docs/errors/function_payload_too_large
