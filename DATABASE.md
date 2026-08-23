# Memory Studio — Database Design

## 1. Purpose

This document defines the initial relational model for Memory Studio V1.

Database:
- Supabase Postgres
- accessed from the application through Drizzle ORM

Design goals:
- preserve historical booking truth,
- prevent double booking,
- support idempotent Stripe processing,
- avoid client accounts,
- keep media bytes outside Postgres,
- remain simple enough for one-booth V1.

---

## 2. Conventions

### IDs

Use UUID primary keys.

Recommended:

```sql
id uuid primary key default gen_random_uuid()
```

### Time

Use:

```text
date        for event dates
timestamptz for instants/audit timestamps
```

Store timestamps in UTC.

### Money

Use integer cents:

```text
integer or bigint
```

Never use floating point for money.

### Soft Delete

Do not add `deleted_at` to every table automatically.

Use lifecycle statuses and immutable history where domain history matters.

### Public IDs

Do not expose database sequencing.

UUIDs may be used internally, but private access must still require authorization.

Bookings also receive a short human-readable `reference_code` (for example `MS-8K4P2`) for support and communication. The reference code is not an access token and must never be treated as authorization.

---

# 3. Tables

## 3.1 `inquiries`

Represents a prospective customer's public inquiry.

Suggested columns:

```text
id                       uuid PK

first_name               text NOT NULL
last_name                text
partner_first_name       text
partner_last_name        text

email                    text NOT NULL
phone                    text

event_type               text NOT NULL DEFAULT 'wedding'
event_date               date NOT NULL
venue_name               text
venue_city               text
venue_state              text
estimated_guest_count    integer

package_interest         text
message                  text
lead_source              text

status                   inquiry_status NOT NULL DEFAULT 'new'

retention_expires_at     timestamptz NULL
anonymized_at            timestamptz NULL

created_at               timestamptz NOT NULL DEFAULT now()
updated_at               timestamptz NOT NULL DEFAULT now()
```

Suggested enum:

```text
inquiry_status:
new
reviewing
waitlisted
declined
converted
```

Indexes:

```text
(event_date)
(status)
(lower(email))
(created_at desc)
```

Do not make email unique.

`event_type` remains text rather than a Postgres enum in V1. Start with values such as `wedding`, `engagement`, and `other`, while validating supported values in application code.

Unconverted inquiry data is operational/marketing data rather than immutable accounting history. `retention_expires_at` supports a future policy-driven cleanup/anonymization window, and `anonymized_at` records when personal fields were removed or generalized. V1 does not need automatic inquiry anonymization, but the schema must support it.

---

## 3.2 `bookings`

Central approved service record.

Suggested columns:

```text
id                        uuid PK
inquiry_id                uuid FK inquiries(id) NULL UNIQUE
reference_code            text NOT NULL UNIQUE

primary_contact_name      text NOT NULL
partner_name              text
email                     text NOT NULL
phone                     text

event_type                text NOT NULL DEFAULT 'wedding'
event_date                date NOT NULL
event_timezone            text NOT NULL DEFAULT 'America/Los_Angeles'

venue_name                text
venue_address_line1       text
venue_address_line2       text
venue_city                text
venue_state               text
venue_postal_code         text

internal_notes            text NULL

status                    booking_status NOT NULL

currency                  text NOT NULL DEFAULT 'usd'

subtotal_cents            integer NOT NULL
total_cents               integer NOT NULL
required_retainer_cents   integer NOT NULL

customization_due_at      timestamptz NULL
customization_locked_at   timestamptz NULL

balance_due_at            timestamptz NULL

gallery_published_at      timestamptz NULL
gallery_expires_at        timestamptz NULL

created_at                timestamptz NOT NULL DEFAULT now()
updated_at                timestamptz NOT NULL DEFAULT now()
confirmed_at              timestamptz NULL
expired_at                timestamptz NULL
completed_at              timestamptz NULL
cancelled_at              timestamptz NULL
```

Suggested enum:

```text
booking_status:
hold
confirmed
expired
cancelled
completed
```

Canonical lifecycle semantics:

- `hold` — the inquiry has been approved and the event date is temporarily reserved, but the required retainer has not yet confirmed the booking.
- `confirmed` — the current required contract is signed, the required retainer has been successfully received, and the booth/date reservation is confirmed.
- `expired` — the temporary hold expired before confirmation.
- `cancelled` — an active booking was intentionally cancelled rather than naturally expiring.
- `completed` — Memory Studio has fulfilled the contracted event and delivered/published the final client media.

`completed` does **not** mean merely that the event date has passed.

Operational labels such as `awaiting_contract`, `awaiting_retainer`, `awaiting_customization`, `balance_due`, `event_upcoming`, `media_processing`, and `gallery_ready` are derived from authoritative fields and related records. They are not persisted as `booking.status` values.

Valid lifecycle transitions:

```text
hold
 ├──> confirmed
 ├──> expired
 └──> cancelled

confirmed
 ├──> completed
 └──> cancelled
```

`expired`, `cancelled`, and `completed` are terminal for ordinary status mutation. Reactivation must use an explicit business workflow that re-checks availability and creates/restores the appropriate reservation rather than directly changing a terminal status back to `hold` or `confirmed`.

Important:
- `reference_code` is a short human-readable identifier for emails, contracts, Stripe metadata, and admin support. It is not an authentication secret.
- `event_type` remains text in V1 so future event categories do not require an enum migration.
- `total_cents` is derived when the booking snapshot changes.
- `required_retainer_cents` is the amount required to confirm the booking. Before confirmation it tracks 30% of the current approved total; after successful confirmation it becomes historical and must not be recalculated merely because later adjustments change the booking total.
- Before a contract is signed, admin-approved line items may be edited and totals regenerated.
- After signature, material changes require a new contract version.
- `confirmed_at`, `expired_at`, `cancelled_at`, and `completed_at` record the corresponding lifecycle transition timestamps.

Constraints / invariants:

```text
subtotal_cents >= 0
total_cents >= 0
required_retainer_cents >= 0
currency = lowercase ISO-like code, initially 'usd'

reference_code matches:
^MS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{7}$

status = 'confirmed'
  -> confirmed_at IS NOT NULL

status = 'expired'
  -> expired_at IS NOT NULL

status = 'cancelled'
  -> cancelled_at IS NOT NULL

status = 'completed'
  -> confirmed_at IS NOT NULL
  -> completed_at IS NOT NULL
  -> gallery_published_at IS NOT NULL

gallery_expires_at IS NULL
  OR gallery_published_at IS NOT NULL

gallery_expires_at IS NULL
  OR gallery_expires_at > gallery_published_at

status <> 'hold'
  OR required_retainer_cents = round(total_cents * 0.30)
```

Additional relational invariant:

```text
UNIQUE(inquiry_id)
```

This allows multiple `NULL` values while ensuring one inquiry can convert to at most one booking.

Add a composite uniqueness target so reservations can reference the booking/date pair:

```text
UNIQUE(id, event_date)
```

Indexes:

```text
(event_date)
(status)
(status, event_date)
(lower(email))
(created_at desc)
```

### Booking reference-code generation

Generate `reference_code` with cryptographically secure randomness using this alphabet:

```text
ABCDEFGHJKMNPQRSTUVWXYZ23456789
```

Example:

```text
MS-7H3K9QZ
```

Do not pre-check availability and assume it remains free. Attempt the insert and, on a unique-key collision, generate a new reference code and retry.

`reference_code` is for human communication only and is never an authentication credential.

---

## 3.3 `booking_line_items`

Price snapshots for the approved booking scope.

Before the current contract is signed, line items may be created, edited, or removed.

After the current contract is signed, existing signed-scope line items are treated as frozen history. Do not delete or rewrite them to represent later scope changes. Use explicit adjustment line items instead, and create a new contract version when the business/legal rules require a new signature.

Suggested columns:

```text
id                    uuid PK
booking_id            uuid FK bookings(id) NOT NULL

item_type             line_item_type NOT NULL
catalog_key           text NULL

description           text NOT NULL
quantity              integer NOT NULL DEFAULT 1
unit_price_cents      integer NOT NULL
line_total_cents      integer NOT NULL

sort_order            integer NOT NULL DEFAULT 0

created_at            timestamptz NOT NULL DEFAULT now()
```

Suggested enum:

```text
line_item_type:
package
addon
adjustment
discount
travel
other
```

Database constraints:

```text
quantity > 0
sort_order >= 0
trim(description) <> ''
line_total_cents = quantity * unit_price_cents

item_type IN ('package', 'addon', 'travel', 'other')
  -> unit_price_cents >= 0

item_type = 'discount'
  -> unit_price_cents <= 0

item_type = 'adjustment'
  -> unit_price_cents may be positive or negative
```

Add a partial unique index allowing at most one base package row per booking:

```text
UNIQUE(booking_id)
WHERE item_type = 'package'
```

Package upgrades/downgrades after signing are represented through adjustment line items rather than inserting a second base package row.

For discounts and scope-removal adjustments, use negative `unit_price_cents` consistently.

Recommended V1 rules:

- `package`, `addon`, `travel`, and ordinary `other` items use non-negative unit prices,
- `discount` items may use negative unit prices,
- `adjustment` items may be positive or negative because they represent post-approval scope/price changes,
- validate the resulting booking total so it cannot become negative.

`catalog_key` is informational, for example:

```text
package.signature
addon.extra_hour
addon.highlight_film
```

Historical pricing is determined by the snapshot fields, not by current catalog config.

### Post-contract adjustment model

V1 uses an adjustment model rather than a separate quote-revision subsystem.

Example:

```text
Signature Package             $699
Highlight Film                $225
Remove Highlight Film        -$225
----------------------------------
New Total                     $699
```

Rules:

- signed-scope line items remain preserved,
- later scope/price changes are represented by additional adjustment/discount line items,
- recalculate and snapshot the new booking total,
- if the required retainer has not yet been paid, recalculate the 30% retainer from the newly approved total before creating a payment session,
- once the required retainer has been successfully paid and the booking is confirmed, freeze `required_retainer_cents` as the historical amount that confirmed the booking,
- after confirmation, later add-ons increase the remaining balance and removals/credits decrease the remaining balance,
- never rewrite the successful historical retainer payment,
- do not require the client to "top up" the retainer just because the booking total increases after confirmation,
- if a post-signature price or scope change occurs, create adjustment line item(s), generate a replacement contract version, and require the client to sign the new contract before the revised terms are treated as accepted,
- if the resulting net paid amount exceeds the current booking total, do not auto-refund; derive an overpayment amount and flag it for admin review,
- do not destroy historical line items simply to make the current total look cleaner.

---

## 3.4 `date_reservations`

Enforces one-booth date exclusivity.

Suggested columns:

```text
id                  uuid PK
booking_id          uuid FK bookings(id) NOT NULL UNIQUE
event_date          date NOT NULL UNIQUE

status              reservation_status NOT NULL
hold_expires_at     timestamptz NULL

created_at          timestamptz NOT NULL DEFAULT now()
updated_at          timestamptz NOT NULL DEFAULT now()
confirmed_at        timestamptz NULL
```

Suggested enum:

```text
reservation_status:
hold
confirmed
```

The table should contain only active reservations.

When a hold expires/releases:
- delete the active reservation row inside a controlled workflow, and
- preserve booking status/audit history in `bookings`/audit logs.

Alternative: retain expired rows in this table using a partial unique index. If implemented, document the exact index and concurrency behavior.

Recommended V1: active-reservations-only table plus booking/audit history.

Critical constraints / invariants:

```text
UNIQUE(event_date)
UNIQUE(booking_id)
```

Add a composite foreign key:

```text
(date_reservations.booking_id, date_reservations.event_date)
  REFERENCES bookings(id, event_date)
```

This guarantees the reservation date always matches the booking's event date.

Reservation-state checks:

```text
status = 'hold'
  -> hold_expires_at IS NOT NULL
  -> confirmed_at IS NULL

status = 'confirmed'
  -> hold_expires_at IS NULL
  -> confirmed_at IS NOT NULL
```

`UNIQUE(event_date)` remains the final database protection against two active bookings for the same date.

---

## 3.5 `contract_templates`

Stores versioned contract source content.

Suggested columns:

```text
id                uuid PK
version           text NOT NULL UNIQUE
name              text NOT NULL

source_format     text NOT NULL
source_content    text NOT NULL

is_active         boolean NOT NULL DEFAULT false

created_at        timestamptz NOT NULL DEFAULT now()
```

Only one template should normally be active for new contracts.

Add a partial unique index allowing at most one active template:

```text
UNIQUE(single constant/expression)
WHERE is_active = true
```

Implementation may use a Postgres partial unique index such as a unique index on `(is_active)` where `is_active = true`.

Zero active templates is allowed during setup; two active templates are not.

Do not edit old versions after they have been used for signed contracts.

---

## 3.6 `contracts`

Stores exact booking-specific contract snapshots and signature evidence.

Suggested columns:

```text
id                    uuid PK
booking_id            uuid FK bookings(id) NOT NULL
template_id           uuid FK contract_templates(id) NULL

version_number        integer NOT NULL

status                contract_status NOT NULL

rendered_content      text NOT NULL
content_hash          text NOT NULL

booking_total_cents   integer NOT NULL
currency              text NOT NULL DEFAULT 'usd'

signed_name           text NULL
signed_email          text NULL
accepted              boolean NOT NULL DEFAULT false
signed_at             timestamptz NULL
signed_ip             inet NULL
signed_user_agent     text NULL

superseded_at         timestamptz NULL

created_at            timestamptz NOT NULL DEFAULT now()
```

Suggested enum:

```text
contract_status:
draft
signed
superseded
```

Constraints / invariants:

```text
UNIQUE(booking_id, version_number)

version_number > 0
booking_total_cents >= 0

content_hash matches:
^[0-9a-f]{64}$

status = 'signed'
  -> accepted = true
  -> signed_at IS NOT NULL
  -> signed_name IS NOT NULL
  -> signed_email IS NOT NULL

status = 'superseded'
  -> superseded_at IS NOT NULL
```

Add a partial unique index enforcing at most one current non-superseded contract per booking:

```text
UNIQUE(booking_id)
WHERE status <> 'superseded'
```

Recommended supporting index:

```text
(booking_id, status)
```

When replacing a contract, supersede the prior current contract and create the replacement within the same transaction so the partial unique index is never violated.

Never update `rendered_content` or `content_hash` after signing.

Use SHA-256 for `content_hash` so the application can verify the exact rendered contract content that was signed.

---

## 3.7 `payments`

Internal record of payment attempts/results.

Suggested columns:

```text
id                         uuid PK
booking_id                 uuid FK bookings(id) NOT NULL

payment_type               payment_type NOT NULL
status                     payment_status NOT NULL

amount_cents               integer NOT NULL
currency                   text NOT NULL DEFAULT 'usd'

stripe_checkout_session_id text NULL UNIQUE
stripe_payment_intent_id   text NULL UNIQUE
stripe_invoice_id          text NULL

paid_at                    timestamptz NULL
refunded_cents             integer NOT NULL DEFAULT 0

created_at                 timestamptz NOT NULL DEFAULT now()
updated_at                 timestamptz NOT NULL DEFAULT now()
```

Suggested enums:

```text
payment_type:
deposit
balance
addon
other
```

```text
payment_status:
pending
paid
failed
cancelled
partially_refunded
refunded
```

Constraints / invariants:

```text
amount_cents > 0
refunded_cents >= 0
refunded_cents <= amount_cents

status = 'paid'
  -> paid_at IS NOT NULL
  -> refunded_cents = 0

status = 'partially_refunded'
  -> paid_at IS NOT NULL
  -> refunded_cents > 0
  -> refunded_cents < amount_cents

status = 'refunded'
  -> paid_at IS NOT NULL
  -> refunded_cents = amount_cents

status IN ('pending', 'failed', 'cancelled')
  -> refunded_cents = 0
```

Add an index:

```text
(booking_id, status)
```

`stripe_payment_intent_id` is unique when present. `stripe_invoice_id` is intentionally not globally unique because a later invoice workflow may associate multiple payment events with one invoice.

`refunded_cents` is a convenience summary and must agree with successful rows in `payment_refunds`. The refund records are the historical source of truth for refund events.

Do not rely on this table alone to deduplicate Stripe events. Use `stripe_events`.

---

## 3.8 `payment_refunds`

Represents money returned against a previously successful payment.

Refunds are not modeled as a `payment_type` because payments represent money received and refunds represent money returned.

Suggested columns:

```text
id                         uuid PK
payment_id                 uuid FK payments(id) NOT NULL

amount_cents               integer NOT NULL
currency                   text NOT NULL DEFAULT 'usd'

stripe_refund_id           text NULL UNIQUE
status                     refund_status NOT NULL

reason                     text NULL

created_at                 timestamptz NOT NULL DEFAULT now()
updated_at                 timestamptz NOT NULL DEFAULT now()
refunded_at                timestamptz NULL
```

Suggested enum:

```text
refund_status:
pending
succeeded
failed
cancelled
```

Constraints:

```text
amount_cents > 0
```

Rules / invariants:

- never delete or rewrite the original successful payment to represent a refund,
- one payment may have multiple refund records,
- `amount_cents > 0`,
- `status = 'succeeded'` requires `refunded_at IS NOT NULL`,
- the application must prevent cumulative successful refunds from exceeding the refundable amount of the source payment,
- cumulative refund validation is transactional/service-level because it requires examining sibling refund rows,
- Stripe webhook processing should update refund state idempotently where applicable.

Indexes:

```text
(payment_id)
(status)
```

Do not store a redundant `booking_id` on `payment_refunds`. The booking is reached through `payments.booking_id`, which prevents a refund from accidentally referencing a payment from one booking and a different booking ID.

---

## 3.9 `stripe_events`

Idempotency ledger for webhook deliveries.

Suggested columns:

```text
stripe_event_id         text PK
event_type              text NOT NULL
api_version             text NULL

processed_at            timestamptz NOT NULL DEFAULT now()
booking_id              uuid FK bookings(id) NULL

payload_reference       text NULL
```

The full raw payload does not need to be retained forever if Stripe Dashboard/history is sufficient for operations.

Critical rule:

```text
INSERT stripe_event_id once
```

If the insert conflicts, the event has already been processed and state-changing work must not run again.

Depending on transaction design, insert the event and perform the business mutation atomically.

---

## 3.10 `client_magic_links`

One-time email access tokens.

Suggested columns:

```text
id                uuid PK
booking_id        uuid FK bookings(id) NOT NULL

token_hash        text NOT NULL UNIQUE
expires_at        timestamptz NOT NULL
used_at           timestamptz NULL
revoked_at        timestamptz NULL

created_at        timestamptz NOT NULL DEFAULT now()
```

Never store the raw token.

Use SHA-256 hexadecimal hashes for `token_hash`.

Constraints:

```text
token_hash matches ^[0-9a-f]{64}$
expires_at > created_at

used_at IS NULL OR used_at >= created_at
revoked_at IS NULL OR revoked_at >= created_at
```

Indexes:

```text
(token_hash)
(booking_id)
(expires_at)
```

---

## 3.11 `client_sessions`

Passwordless client sessions.

Suggested columns:

```text
id                uuid PK
booking_id        uuid FK bookings(id) NOT NULL

session_hash      text NOT NULL UNIQUE
expires_at        timestamptz NOT NULL
last_seen_at      timestamptz NULL
revoked_at        timestamptz NULL

created_at        timestamptz NOT NULL DEFAULT now()
```

Never store the raw cookie token.

Use SHA-256 hexadecimal hashes for `session_hash`.

Constraints:

```text
session_hash matches ^[0-9a-f]{64}$
expires_at > created_at

last_seen_at IS NULL OR last_seen_at >= created_at
revoked_at IS NULL OR revoked_at >= created_at
```

Indexes:

```text
(session_hash)
(booking_id)
(expires_at)
```

---

## 3.12 `booking_customizations`

One customization record per booking.

Suggested columns:

```text
id                    uuid PK
booking_id            uuid FK bookings(id) NOT NULL UNIQUE

display_name_1        text
display_name_2        text
welcome_message       text
signage_text          text
client_notes          text

submitted_at          timestamptz NULL
created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()
```

Lock state lives on `bookings.customization_locked_at`.

Color fields are intentionally absent in V1.

---

## 3.13 `booking_prompts`

Ordered recording prompts.

Suggested columns:

```text
id                uuid PK
booking_id        uuid FK bookings(id) NOT NULL

prompt_text       text NOT NULL
sort_order        integer NOT NULL

created_at        timestamptz NOT NULL DEFAULT now()
updated_at        timestamptz NOT NULL DEFAULT now()
```

Constraints:

```text
UNIQUE(booking_id, sort_order)
sort_order >= 0
trim(prompt_text) <> ''
```

Prompt-count limits are enforced by domain logic based on approved service scope/package.

---

## 3.14 `media_assets`

Metadata for private R2 objects.

Suggested columns:

```text
id                    uuid PK
booking_id            uuid FK bookings(id) NOT NULL
source_media_asset_id uuid FK media_assets(id) NULL

media_type            media_type NOT NULL
storage_status        media_storage_status NOT NULL DEFAULT 'pending'

r2_object_key         text NOT NULL UNIQUE
original_filename     text NOT NULL
display_name          text
mime_type             text NOT NULL
size_bytes            bigint NOT NULL
duration_seconds      integer NULL

is_visible            boolean NOT NULL DEFAULT false
is_downloadable       boolean NOT NULL DEFAULT false

retention_expires_at  timestamptz NULL
storage_deleted_at    timestamptz NULL

sort_order            integer NOT NULL DEFAULT 0

uploaded_at           timestamptz NULL
created_at            timestamptz NOT NULL DEFAULT now()
updated_at            timestamptz NOT NULL DEFAULT now()
```

Suggested enums:

```text
media_type:
original
web
highlight
delivery_archive
other
```

```text
media_storage_status:
pending
uploaded
failed
deleted
```

`source_media_asset_id` links derived files to the original recording they came from.

Example:

```text
Original MOV
id = A

Web MP4
source_media_asset_id = A
```

This allows the gallery to use a browser-friendly playback asset while still offering the related original file for download.

`storage_status` tracks whether the object upload is actually usable. A presigned upload may be created before the browser successfully uploads the file, so `pending` records must not be treated as deliverable media.

Media lifecycle rules:

- `pending` — upload authorization/metadata exists, but the object is not yet confirmed usable,
- `uploaded` — the object exists in R2 and may be eligible for playback/download,
- `failed` — an upload attempt failed or the object could not be validated,
- `deleted` — the object has been intentionally removed from R2 while its metadata row is retained for history.

`gallery_expires_at` on the booking controls normal client gallery access. It is separate from physical object retention.

`retention_expires_at` on each asset controls when that specific R2 object becomes eligible for deletion. This allows originals, web copies, archives, and other asset types to have different retention periods later without a schema migration.

`storage_deleted_at` records when the R2 object was successfully removed. Deleting an object does not hard-delete its `media_assets` row.

Gallery access and physical storage retention are intentionally separate. An expired gallery does not automatically imply that its objects have already been deleted. This permits a configurable grace period for support/recovery.

A derived asset and its source asset have independent lifecycles. Deleting an original does not automatically delete its web copy, and deleting a web copy does not automatically delete its original. `source_media_asset_id` records provenance, not cascade-deletion behavior.

V1 should perform media deletion through application-controlled cleanup/admin workflows rather than relying exclusively on storage-provider lifecycle rules. The application should:

1. identify an asset eligible for deletion,
2. delete the R2 object,
3. confirm deletion,
4. set `storage_status = deleted`,
5. set `storage_deleted_at`,
6. preserve the metadata record.

Client gallery/playback queries must require at least:

```text
booking matches authenticated client session
AND gallery is published
AND gallery access has not expired
AND media_assets.storage_status = 'uploaded'
AND media_assets.is_visible = true
```

Downloads additionally require:

```text
media_assets.is_downloadable = true
```

Do not store:
- video bytes,
- permanent public URLs,
- long-lived presigned URLs.

Constraints / invariants:

```text
size_bytes >= 0
duration_seconds IS NULL OR duration_seconds >= 0
sort_order >= 0
trim(r2_object_key) <> ''

source_media_asset_id IS NULL
  OR source_media_asset_id <> id

storage_status = 'uploaded'
  -> uploaded_at IS NOT NULL

storage_status = 'deleted'
  -> storage_deleted_at IS NOT NULL

storage_status <> 'deleted'
  -> storage_deleted_at IS NULL

is_visible = true
  -> storage_status = 'uploaded'
```

Add a same-booking provenance constraint using a composite self-reference:

```text
UNIQUE(id, booking_id)

(source_media_asset_id, booking_id)
  REFERENCES media_assets(id, booking_id)
```

This prevents a derived asset from pointing to a source belonging to another customer's booking.

Indexes:

```text
(booking_id, is_visible, sort_order)
(booking_id, media_type)
(booking_id, storage_status)
(retention_expires_at)
(source_media_asset_id)
```

---

## 3.15 `admin_users`

Application authorization record for Supabase-authenticated admins.

Suggested columns:

```text
id                   uuid PK
supabase_user_id     uuid NOT NULL UNIQUE
role                 admin_role NOT NULL DEFAULT 'admin'
is_active            boolean NOT NULL DEFAULT true

created_at           timestamptz NOT NULL DEFAULT now()
updated_at           timestamptz NOT NULL DEFAULT now()
```

Suggested enum:

```text
admin_role:
owner
admin
```

V1 can start with only the owner account while preserving an authorization boundary.

---

## 3.16 `audit_log`

Required for V1 operational traceability.

The audit log is intentionally lightweight. It exists to make important admin/business state changes explainable during debugging and support.

Suggested columns:

```text
id                uuid PK
actor_type        text NOT NULL
actor_id          text NULL
actor_display_name text NULL

booking_id        uuid NULL
inquiry_id        uuid NULL

action            text NOT NULL
metadata_json     jsonb NULL

created_at        timestamptz NOT NULL DEFAULT now()
```

Useful events:

```text
inquiry.approved
inquiry.declined
reservation.created
reservation.expired
contract.signed
contract.superseded
payment.recorded
booking.confirmed
customization.locked
gallery.published
```

Do not put secrets/tokens in audit metadata.

`actor_display_name` snapshots the human-readable actor name at event time so audit history remains understandable even if an admin is later deactivated or renamed. Audit rows are append-only in normal operation and have no ordinary edit/delete UI.

---

# 4. Relationships

```text
inquiries
   │ 0..1
   ▼
bookings
   ├──────── booking_line_items
   ├──────── date_reservations
   ├──────── contracts
   ├──────── payments
   │            └──────── payment_refunds (via payment_id)
   ├──────── client_magic_links
   ├──────── client_sessions
   ├──────── booking_customizations
   ├──────── booking_prompts
   └──────── media_assets

contract_templates
   └──────── contracts

bookings
   └──────── stripe_events (optional booking association)

Supabase Auth user
   └──────── admin_users

audit_log
   └──────── optional references to bookings/inquiries + actor identity
```

---

# 5. Derived Values

Prefer deriving these from authoritative data rather than storing multiple conflicting versions.

### Paid Amount

```text
sum(successful payment amounts)
- sum(successful payment_refunds)
```

### Remaining Balance / Amount Due

```text
raw_balance = booking.total_cents - net_paid_cents

amount_due = max(raw_balance, 0)

overpaid_amount = max(net_paid_cents - booking.total_cents, 0)
```

Do not trust a client-submitted balance.

If `overpaid_amount > 0`, flag the booking for admin review. Do not automatically issue a refund.

### Deposit Requirement

Persist `required_retainer_cents` on the booking snapshot.

Before confirmation:

```text
required_retainer_cents = round(total_cents * 0.30)
```

After successful confirmation:

```text
required_retainer_cents = historical confirmation retainer
```

Do not recalculate the historical retainer merely because later adjustments change the current booking total.

### Balance due date snapshot

`balance_due_at` is stored on each booking so historical bookings retain the actual deadline applied to them even if Memory Studio changes its standard payment policy later.

### Gallery Availability

Derived from:
- authenticated client session,
- booking ID match,
- `bookings.gallery_published_at`,
- `media_assets.is_visible`.

### Operational Booking Labels

These are derived for UI/admin workflow and are not persisted in `booking_status`.

Examples:

```text
awaiting_contract =
  booking.status = 'hold'
  AND current contract is unsigned

awaiting_retainer =
  booking.status = 'hold'
  AND current contract is signed
  AND required retainer is not fully paid

customization_needed =
  booking.status = 'confirmed'
  AND customization is not submitted/locked

event_upcoming =
  booking.status = 'confirmed'
  AND event_date is in the future

media_processing =
  booking.status = 'confirmed'
  AND event_date has passed
  AND gallery_published_at IS NULL

gallery_ready =
  gallery_published_at IS NOT NULL

balance_due =
  remaining_balance > 0
  AND `balance_due_at` has arrived
```

Payment state and fulfillment state remain separate. A booking may be `completed` while still having an outstanding balance in an exceptional case; payment records remain the source of truth for money owed.

---

# 6. Transactions and Concurrency

## Approve Inquiry

Must be transactional.

Goal:
- only one inquiry wins a contested date.

Process:

```text
BEGIN

load inquiry
validate convertible state

release stale reservation for event date if policy allows

insert booking
insert line-item snapshots
insert date_reservation(event_date UNIQUE, status='hold')
  with booking_id/event_date composite FK matching bookings(id, event_date)
mark inquiry converted

COMMIT
```

If unique reservation insertion fails, roll back the booking conversion.

## Expire Hold

When a hold expires:

```text
BEGIN

load booking + active reservation
verify booking.status = 'hold'
verify hold_expires_at has passed

delete/release active date_reservation
booking.status -> expired
booking.expired_at -> now()
write audit event

COMMIT
```

Do not directly reactivate an `expired`, `cancelled`, or `completed` booking by changing its status. Any reactivation workflow must re-check date availability and establish a valid reservation first.

## Post-contract Scope/Price Adjustment

When a signed booking changes price or scope:

```text
BEGIN

load booking + current signed contract
append adjustment/discount line item(s)
recalculate booking subtotal/total

if booking is not yet confirmed:
    recalculate required_retainer_cents = round(total * 0.30)

if booking is already confirmed:
    keep required_retainer_cents unchanged
    keep historical successful payments unchanged

derive:
    amount_due = max(total - net_paid, 0)
    overpaid_amount = max(net_paid - total, 0)

create replacement contract snapshot
mark prior contract superseded
require new signature before revised terms are accepted

COMMIT
```

Rules:

- do not delete original signed-scope line items,
- do not "top up" a previously paid retainer after confirmation,
- positive adjustments increase the remaining balance,
- negative adjustments decrease the remaining balance,
- overpayments require admin review and are never automatically refunded.

## Stripe Deposit Completion

Must be idempotent and transactionally safe.

```text
BEGIN

insert stripe_event_id
  -> if duplicate: exit safely

lock/load payment + booking/reservation
record paid state
verify paid amount/business conditions

if required retainer satisfied and reservation valid:
    reservation -> confirmed
    booking -> confirmed

COMMIT
```

## Refund Recording

Refund processing must preserve the original payment and create/update `payment_refunds` records.

```text
BEGIN

insert/validate stripe event idempotently when webhook-driven
load original payment
insert or update refund by stripe_refund_id using payment_id (booking is derived through payments.booking_id)
recalculate payments.refunded_cents from successful refund records

COMMIT
```

Never convert the original payment into a negative payment or delete it.

---

# 7. Drizzle Organization

Suggested files:

```text
src/lib/db/
├── index.ts
├── schema/
│   ├── enums.ts
│   ├── inquiries.ts
│   ├── bookings.ts
│   ├── reservations.ts
│   ├── contracts.ts
│   ├── payments.ts
│   ├── refunds.ts
│   ├── client-access.ts
│   ├── customizations.ts
│   ├── media.ts
│   └── admin.ts
└── relations.ts
```

Migrations:

```text
drizzle/
```

Do not edit already-applied production migrations. Create forward migrations.

---

# 8. Initial Seed/Config Strategy

Do not build package-management CMS tables in V1 unless needed.

Use code configuration for current offerings, e.g.:

```text
src/config/pricing.ts
```

When an admin approves a booking, copy chosen values into `booking_line_items`.

This gives:
- simple launch configuration,
- immutable booking history,
- no early admin-CMS complexity.

---

# 9. Row-Level Security / Browser Access

Preferred V1 data-access model:

- business tables are accessed from trusted server code,
- browser does not directly query sensitive booking/media/payment tables,
- Supabase Auth is used for admin identity,
- server code enforces application authorization.

Enable Row Level Security on Supabase-exposed business tables as defense-in-depth. Do not create broad anonymous/client policies for sensitive tables such as:

```text
bookings
contracts
payments
payment_refunds
media_assets
client_magic_links
client_sessions
audit_log
```

If any table is later queried directly from the browser through Supabase, define and test explicit least-privilege RLS policies before enabling that path.

RLS complements rather than replaces the server-side authorization/service layer.

---

# 10. Data Retention

## 10.1 Media Retention — Locked V1 Structure

The exact number of retention days remains a business-policy decision, but the database structure is locked around these principles:

- gallery access expiration and physical media deletion are separate,
- `bookings.gallery_expires_at` controls normal client access,
- `media_assets.retention_expires_at` controls per-object deletion eligibility,
- raw originals, web copies, delivery archives, and other asset types may later use different retention durations,
- expiring a gallery does not immediately delete media,
- R2 deletion is application-controlled in V1,
- after physical deletion, keep the `media_assets` metadata row with `storage_status = deleted` and `storage_deleted_at`,
- source and derived assets have independent retention lifecycles,
- media expiration/deletion must never cascade-delete booking, contract, payment, refund, or audit history.

Potentially removable R2 objects include:

- raw wedding recordings,
- browser-friendly playback copies,
- delivery archives,
- abandoned/failed temporary uploads.

## 10.2 Non-Media Retention / Hard-Delete Policy — Locked V1 Structure

V1 uses three retention categories.

### Tier 1 — Business/history records

These have no normal hard-delete workflow:

- `bookings`,
- `booking_line_items`,
- `contracts`,
- `payments`,
- `payment_refunds`,
- `audit_log`.

They preserve service, contract, payment, refund, and lifecycle history. Future privacy/accounting policy may permit targeted anonymization of unnecessary personal fields, but ordinary application actions must not delete these records.

### Tier 2 — Operational records

These are retained in V1 but may later be subject to policy-based anonymization or cleanup:

- unconverted `inquiries`,
- `booking_customizations`,
- `booking_prompts`.

For inquiries, `retention_expires_at` and `anonymized_at` support future cleanup without a migration. Converted bookings remain the authoritative customer/service snapshot.

### Tier 3 — Security/access records

These should expire and may be hard-deleted after a short cleanup/grace period:

- `client_magic_links`,
- `client_sessions`.

Expired/revoked token/session rows are authentication artifacts, not permanent customer history.

### Stripe event ledger

Keep the lightweight `stripe_events` idempotency ledger long-term in V1. It is small, supports debugging, and prevents duplicate webhook side effects. Do not store secrets/card data in it.

### Admin users

Deactivate admins with `is_active = false` rather than deleting them. Audit history should remain attributable to the historical actor.

### Foreign-key deletion philosophy

Avoid `ON DELETE CASCADE` for records that prove money, agreement, consent, or lifecycle history.

Use explicit deletion behavior in migrations:

```text
bookings -> contracts          RESTRICT / NO ACTION
bookings -> payments           RESTRICT / NO ACTION
payments -> payment_refunds    RESTRICT / NO ACTION
bookings -> booking_line_items RESTRICT / NO ACTION
bookings -> media_assets       RESTRICT / NO ACTION
```

For `audit_log`, use preservation-safe references such as `ON DELETE SET NULL` for optional booking/inquiry foreign keys so an extraordinary future purge does not erase the historical log row.

Disposable access artifacts such as magic links/sessions may be hard-deleted through dedicated cleanup workflows.

No normal V1 UI should expose a generic **Delete Booking** action.

---


# 11. Database-Enforced Invariants — Pass 5 (Locked)

This section is the final pre-migration contract for V1.

The database should protect high-value invariants even if application code is buggy. Use five complementary layers:

```text
1. Postgres types/enums
2. CHECK constraints
3. UNIQUE / partial UNIQUE indexes
4. Foreign-key relationships
5. Transactional domain services
```

## 11.1 Enforce in Postgres

The first migration should encode, where practical:

- one booking per non-null inquiry,
- unique structured `reference_code`,
- lifecycle/status timestamp consistency,
- completed bookings require a published gallery,
- gallery expiration must occur after publication,
- 30% retainer consistency while a booking is still on hold,
- non-negative booking totals,
- line-item arithmetic/sign/description/order checks,
- at most one base package line item per booking,
- one active reservation per event date,
- reservation date must equal booking event date,
- hold/confirmed reservation timestamp consistency,
- one current non-superseded contract per booking,
- one active contract template,
- positive contract version numbers and totals,
- SHA-256 contract hash format,
- signed-contract evidence consistency,
- unique Stripe Checkout Session and PaymentIntent identifiers when present,
- payment/refund status consistency,
- SHA-256 token/session hash format and valid expiration timestamps,
- prompt uniqueness/non-empty/order checks,
- same-booking media provenance,
- media storage/visibility/timestamp consistency,
- default-deny media downloads,
- explicit foreign-key deletion behavior,
- RLS defense-in-depth.

## 11.2 Keep in transactional domain services

Do **not** add complicated custom database triggers for cross-table business workflows in V1.

Keep these rules in tested transactional services:

```text
booking.total_cents = SUM(current booking line items)

current contract must be signed before Stripe Checkout creation

verified retainer payment confirms the reservation/booking

successful cumulative refunds may not exceed the original payment

prompt count must match approved package/service scope

reservation lifecycle must agree with booking lifecycle

post-signature adjustment creates/supersedes contract versions correctly

overpayment requires admin review rather than automatic refund
```

Use row locks/transactions where concurrency matters.

## 11.3 Migration implementation guidance

Claude should translate the locked invariants into Drizzle schema definitions and SQL migrations. When Drizzle cannot express a Postgres partial index, regex CHECK, composite self-reference, or other required invariant cleanly, use explicit SQL in the migration rather than dropping the invariant.

Do not weaken an invariant merely to keep the migration DSL shorter.

After generating the migration:

1. inspect the generated SQL,
2. test a clean migration against the development database,
3. test each critical constraint with at least one invalid insert/update,
4. run concurrency tests for same-date booking approval,
5. document any invariant intentionally kept at the service layer.

Once the first production migration is applied, never edit it in place; use forward migrations.

---

# 12. Schema Decisions Deferred


Do not add these until required:

- booths/resources table,
- event time-slot scheduling,
- vendors/referrals,
- promo-code engine,
- customer account/user table,
- SMS logs,
- video-transcoding jobs,
- comments/reactions,
- multi-company tenancy,
- complex tax engine.

When Booth #2 becomes real, revisit `date_reservations` and model explicit physical resources.
