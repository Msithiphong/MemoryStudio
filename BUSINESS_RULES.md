# Memory Studio — Business Rules

## 1. Purpose

This document defines business behavior independently from UI implementation.

When code is ambiguous, these rules should guide state transitions and validation.

---

## 2. Core Business Model

Memory Studio provides a premium self-service video/audio guest book experience for weddings.

V1 operating model:

- one physical booth,
- primarily drop-off/self-service,
- manual inquiry approval,
- contract before payment,
- 30% retainer to confirm,
- private client customization,
- private digital video delivery after the event.

The website supports the business workflow; it does not replace admin judgment about whether an event should be accepted.

---

## 3. Definitions

### Inquiry

A prospective customer's request for availability/information.

An inquiry:
- does not reserve a date,
- does not guarantee pricing,
- does not guarantee service.

### Booking

An approved service proposal created by Memory Studio from an inquiry.

### Hold

A temporary exclusive reservation of the one physical booth for an event date.

A hold is not a confirmed booking.

### Confirmed Booking

A booking for which:
- the current required contract has been signed,
- the required retainer has been successfully paid,
- the date reservation has been converted from hold to confirmed.

### Retainer

The amount due to confirm the booking.

V1 rule:

```text
retainer = 30% of approved booking total
```

Whether the legal contract describes this amount as refundable/nonrefundable is a legal/policy decision and must be finalized separately.

### Remaining Balance

```text
remaining balance =
current booking total
- successful applicable payments
+ applicable adjustments
- applicable refunds/credits
```

For the simple V1 flow, this will normally be:

```text
booking total - retainer paid
```

### Current Contract

The newest non-superseded contract version required for the booking.

### Client

The booking contact using private client access.

### Admin

An authenticated and authorized Memory Studio operator.

---

## 4. Inquiry Rules

### BR-INQ-001

Anyone may submit an inquiry through the public website subject to validation/abuse controls.

### BR-INQ-002

Submitting an inquiry never creates a date reservation.

### BR-INQ-003

Inquiry fields should include at minimum:

- primary contact name,
- email,
- phone,
- event date,
- venue name if known,
- venue city,
- estimated guest count if known,
- package interest,
- optional message,
- lead source if collected.

### BR-INQ-004

Initial inquiry statuses:

```text
new
reviewing
waitlisted
declined
converted
```

### BR-INQ-005

Only an admin may convert an inquiry into a booking.

### BR-INQ-006

An admin may waitlist an inquiry when the requested date is held/confirmed or when a decision is pending.

### BR-INQ-007

The same person may submit multiple inquiries. Do not assume email uniqueness means inquiry uniqueness.

---

## 5. Availability and One-Booth Rules

### BR-AVL-001

V1 has one physical booth.

### BR-AVL-002

At most one active date reservation may exist per event date.

Active reservation states:

```text
hold
confirmed
```

### BR-AVL-003

Availability must be enforced in the database, not only in application UI.

### BR-AVL-004

Admin approval attempts to create an exclusive temporary hold.

If the date cannot be reserved atomically, approval must fail safely and the inquiry must not be falsely marked converted.

### BR-AVL-005

A hold has an expiration timestamp.

Recommended initial value:

```text
72 hours after approval
```

This value is configurable and must be finalized before launch.

### BR-AVL-006

An expired hold no longer entitles the client to pay a retainer.

### BR-AVL-007

Expired holds should be released by business logic before another booking is approved for the date.

### BR-AVL-008

A confirmed reservation remains exclusive until cancelled/released according to business policy.

### BR-AVL-009

V1 does not attempt to schedule two events on the same date even if their hours do not overlap.

---

## 6. Package and Pricing Rules

### BR-PRC-001

Initial regular package targets:

| Package | Price |
|---|---:|
| Cocktail | $499 |
| Signature | $699 |
| Keepsake | $949 |

Pricing remains configurable.

### BR-PRC-002

Launch/founding-couple pricing may be offered administratively.

It must be represented in the booking's actual line items rather than inferred later from a promotion name.

### BR-PRC-003

A booking total is calculated from snapshotted booking line items.

Each line item includes at minimum:

- description,
- quantity,
- unit price in cents,
- line total in cents,
- category/type.

### BR-PRC-004

All persisted money uses integer cents.

### BR-PRC-005

The server is authoritative for all prices and totals.

### BR-PRC-006

Historical booking line items are not recalculated when current catalog pricing changes.

### BR-PRC-007

Initial potential add-ons include:

- additional rental hour,
- edited keepsake film,
- booth attendant,
- premium backdrop,
- custom signage,
- animated welcome screen,
- rush delivery,
- extended cloud archive,
- anniversary video edit.

A second kiosk is not a V1 add-on because V1 has one physical unit.

### BR-PRC-008

Price ranges such as `$200–$250` must be resolved to one specific approved amount before a booking is sent for contract/payment.

---

## 7. Contract Rules

### BR-CON-001

The client must sign the current required contract before the deposit payment action is enabled.

### BR-CON-002

A contract must preserve the exact content agreed to at signing time.

### BR-CON-003

A signed contract record is immutable.

### BR-CON-004

Signature evidence should include:

- contract version,
- rendered/snapshotted contract content,
- content hash,
- signed legal name,
- affirmative acceptance,
- signed timestamp,
- request IP,
- user agent.

### BR-CON-005

If a material price or service-scope change occurs after signing, the prior contract must not be silently edited.

Create a replacement contract and require a new signature where required by business/legal policy.

### BR-CON-006

Old signed contracts remain retained for audit/history even when superseded.

### BR-CON-007

Contract wording, cancellation terms, retainer treatment, liability limits, data retention, and electronic-signature compliance must be legally reviewed before paid commercial launch.

---

## 8. Payment Rules

### BR-PAY-001

Required retainer:

```text
round(booking_total_cents * 0.30)
```

Use nearest-cent integer rounding.

### BR-PAY-002

A deposit Checkout Session may be created only when:

- booking status is `hold`,
- date reservation belongs to booking,
- hold has not expired,
- current contract is signed,
- required deposit is not already fully paid.

### BR-PAY-003

Stripe—not the client browser—is authoritative for payment completion.

### BR-PAY-004

A success redirect never marks a payment paid.

### BR-PAY-005

Stripe webhook events must be verified and processed idempotently.

### BR-PAY-006

A duplicate Stripe event must not:
- duplicate a payment record,
- confirm a booking twice,
- send duplicate state-changing side effects.

### BR-PAY-007

When the required retainer is successfully received and the date reservation is valid:

```text
booking: hold -> confirmed
date reservation: hold -> confirmed
```

### BR-PAY-008

If payment is reported for a booking whose date can no longer safely be confirmed, flag the booking for manual review rather than overriding another reservation.

### BR-PAY-009

V1 may use Stripe Checkout for both:
- retainer,
- remaining balance.

### BR-PAY-010

Payment records must be retained independently from the booking's display status.

### BR-PAY-011

Refunds must not delete the original successful payment record. Record refund state/events.

### BR-PAY-012

Remaining-balance due timing is **TBD before launch**.

Do not hard-code an arbitrary due date in UI or business logic until decided.

---

## 9. Client Access Rules

### BR-ACC-001

Clients do not create password-based accounts in V1.

### BR-ACC-002

Client access is limited to the booking associated with the authenticated client session.

### BR-ACC-003

Magic-link tokens are:
- cryptographically random,
- stored only as hashes,
- single-use,
- expiring.

### BR-ACC-004

After successful magic-link redemption, create a secure HTTP-only client session.

### BR-ACC-005

Session tokens are stored only as hashes.

### BR-ACC-006

A client can request a new magic link if access expires.

### BR-ACC-007

The access-request endpoint should return a generic response to reduce email/booking enumeration.

### BR-ACC-008

A revoked/cancelled booking may have client access revoked according to business needs, but historical admin data remains retained.

---

## 10. Customization Rules

### BR-CUS-001

Client customization may include:

- couple/display names,
- event date confirmation,
- welcome-screen wording,
- recording prompts,
- custom sign wording when applicable,
- notes to Memory Studio.

### BR-CUS-002

Clients do not select booth colors in V1.

### BR-CUS-003

The number of prompts available may depend on the approved package.

Initial package guidance:

```text
Cocktail: approximately 3 prompts
Signature: approximately 5 prompts
Keepsake: at least Signature-level customization
```

Exact limits may be adjusted administratively.

### BR-CUS-004

Customization has a configurable due date/lock date.

The exact default is **TBD before launch**.

### BR-CUS-005

Once locked, client edits are disabled unless an admin reopens customization.

### BR-CUS-006

Admin changes should preserve a meaningful `updated_at` audit trail.

---

## 11. Event and Delivery Rules

### BR-EVT-001

The operational wedding workflow remains primarily manual in V1:

- prepare booth,
- setup,
- test,
- operate self-service,
- retrieve equipment,
- back up recordings,
- process files,
- upload deliverables,
- publish gallery.

### BR-EVT-002

The website does not guarantee that every guest participates.

### BR-EVT-003

The website should not promise a delivery timeline until that timeline is finalized as a business policy.

### BR-EVT-004

Booking can move to `completed` after the event/fulfillment criteria chosen by the admin.

---

## 12. Media Rules

### BR-MED-001

Customer wedding media is private by default.

### BR-MED-002

Raw media bytes are stored in Cloudflare R2, not Postgres.

### BR-MED-003

The application stores metadata and authorization state in Postgres.

### BR-MED-004

Clients may view/download only media:
- belonging to their booking,
- marked visible/published,
- permitted for the requested action.

### BR-MED-005

Presigned R2 URLs are generated only after authorization.

### BR-MED-006

Presigned URLs are short-lived and are not persisted as durable database values.

### BR-MED-007

Large uploads/downloads should go directly between browser and R2 rather than through a normal Vercel Function payload.

### BR-MED-008

Media types may include:

```text
original
web
highlight
delivery_archive
other
```

### BR-MED-009

V1 may manually create web-friendly MP4 files.

Automated transcoding is not required for V1.

### BR-MED-010

A "Download All" experience should preferably use a pre-built delivery archive rather than dynamically zipping multi-gigabyte media inside a Vercel Function.

### BR-MED-011

Media retention duration is **TBD before launch**.

### BR-MED-012

Client delivery consent is separate from optional marketing/media-release consent.

A recording being delivered to the event hosts does not automatically grant Memory Studio advertising rights.

---

## 13. Admin Rules

### BR-ADM-001

Only authorized Memory Studio admins can:

- approve/decline/waitlist inquiries,
- set booking line items,
- create/release holds,
- alter booking status,
- lock/reopen customization,
- create media upload URLs,
- publish/unpublish gallery assets,
- issue administrative refunds/actions through supported workflows.

### BR-ADM-002

Admin authentication uses Supabase Auth in V1.

### BR-ADM-003

An authenticated Supabase user is not automatically an authorized Memory Studio admin.

Use an explicit admin allowlist/role record.

---

## 14. Email Rules

### BR-EML-001

Important business actions may send transactional email, but email success does not determine transaction success.

Example:
- booking confirmation remains confirmed even if its confirmation email fails.

### BR-EML-002

Initial email events:

- inquiry received,
- approval/hold created,
- waitlisted,
- declined,
- magic access requested,
- retainer paid,
- balance due/reminder,
- customization reminder,
- gallery published.

### BR-EML-003

Email templates should not expose private permanent media URLs.

---

## 15. State Transition Summary

### Inquiry

```text
new -> reviewing
new/reviewing -> waitlisted
new/reviewing/waitlisted -> declined
new/reviewing/waitlisted -> converted
```

### Booking

```text
hold -> confirmed
hold -> expired
hold -> cancelled
confirmed -> cancelled
confirmed -> completed
```

### Date Reservation

```text
hold -> confirmed
hold -> expired/released
confirmed -> released only through a valid cancellation workflow
```

### Contract

```text
draft -> signed
draft -> superseded
signed -> superseded
```

Never mutate `signed` back into `draft`.

### Payment

Suggested statuses:

```text
pending
paid
failed
refunded
partially_refunded
cancelled
```

---

## 16. Launch Decisions Still Required

The following values are intentionally not invented in code yet:

1. Exact hold duration (recommended starting point: 72 hours).
2. Remaining-balance due date relative to event.
3. Cancellation/refund policy.
4. Whether the 30% amount is legally described as a retainer, deposit, booking fee, and/or nonrefundable amount.
5. Rescheduling policy.
6. Customization lock date.
7. Delivery timeline after wedding.
8. Customer media retention duration.
9. Presigned download expiration duration.
10. Client session lifetime.
11. Exact launch/founding-couple discount rules.
12. Which add-ons are offered at launch.
13. Travel/service-area pricing rules.
14. Tax treatment after professional tax/legal review.

Until decided, surface these as configuration/TBD items rather than hidden assumptions.
