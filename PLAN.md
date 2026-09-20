# Memory Studio — V1 Development Plan

## 1. Goal

Build the smallest reliable system that supports a real paid wedding from inquiry through private video delivery.

V1 success path:

```text
marketing site
-> inquiry
-> manual approval
-> date hold
-> client magic-link access
-> contract signature
-> 30% Stripe retainer
-> confirmed booking
-> customization
-> final balance
-> wedding
-> admin media upload
-> private gallery
-> client downloads
```

Do not begin by building the entire workflow at once.

Each phase must leave the application in a testable state.

---

# 2. Development Principles

1. Build vertical slices.
2. Test business rules before adding polish.
3. Use test-mode vendor credentials until production readiness.
4. Keep customer media private from the first media implementation.
5. Do not add future-scale infrastructure without a current requirement.
6. Keep documentation synchronized with implementation.
7. Use migrations for schema changes.
8. Complete one phase's acceptance criteria before starting the next major phase.

---

# 3. Phase 0 — Repository and Foundation

## Objective

Create a stable project foundation and coding-agent context.

## Deliverables

- Next.js 16.x TypeScript project
- Tailwind CSS
- shadcn/ui
- Git repository
- Vercel project
- `.env.example`
- lint/type-check/build scripts
- documentation committed:
  - `CLAUDE.md`
  - `ARCHITECTURE.md`
  - `BUSINESS_RULES.md`
  - `DATABASE.md`
  - `PLAN.md`

## Tasks

- [ ] Initialize repository.
- [ ] Enable TypeScript strict mode.
- [ ] Configure formatting/linting.
- [ ] Add basic route layout.
- [ ] Add environment validation strategy.
- [ ] Establish local/preview/production environment approach.
- [ ] Add CI or at least a repeatable `lint + typecheck + test + build` command.
- [ ] Confirm no secrets are committed.

## Acceptance Criteria

- Project builds locally.
- Vercel preview deploy succeeds.
- Documentation is present in repository.
- No business features are implemented yet.

---

# 4. Phase 1 — Marketing Website

## Objective

Create the premium public-facing website that can generate inquiries.

## Initial Routes

```text
/
 /how-it-works
 /packages
 /gallery
 /faq
 /about
 /inquiry
```

## Content Priorities

- emotional preservation rather than equipment rental,
- clear process,
- Cocktail / Signature / Keepsake packages,
- clear inquiry CTA,
- responsive mobile design,
- portfolio placeholders until real approved content exists.

## Tasks

- [ ] Build global navigation/footer.
- [ ] Build homepage hero.
- [ ] Build "How It Works."
- [ ] Build package comparison.
- [ ] Build FAQ.
- [ ] Build inquiry CTA.
- [ ] Add basic SEO metadata.
- [ ] Add Vercel Analytics.
- [ ] Verify accessibility basics.

## Acceptance Criteria

A visitor can:
- understand the service,
- understand approximate packages,
- find the inquiry form,
- use the site comfortably on mobile.

No payment buttons exist.

---

# 5. Phase 2 — Database and Inquiry System

## Objective

Persist real inquiries.

## Infrastructure

- Supabase project/database
- Drizzle ORM
- initial migrations

## Tables Initially Needed

```text
inquiries
```

Other tables can be introduced when their phase begins if preferred, but schema design should remain consistent with `DATABASE.md`.

## Tasks

- [ ] Configure database connection.
- [ ] Create Drizzle schema/migration.
- [ ] Build inquiry form with React Hook Form + Zod.
- [ ] Validate server-side.
- [ ] Persist inquiry.
- [ ] Add spam/abuse mitigation appropriate for launch.
- [ ] Send inquiry-received email.
- [ ] Show success state without implying date reservation.

## Acceptance Criteria

- Valid inquiry is persisted.
- Invalid input is rejected safely.
- Customer receives appropriate confirmation.
- Confirmation explicitly says the date is not reserved yet.
- Duplicate email inquiries are allowed.

---

# 6. Phase 3 — Admin Authentication and Inquiry Dashboard

## Objective

Allow Memory Studio to review inquiries securely.

## Infrastructure

- Supabase Auth
- `admin_users`

## Tasks

- [ ] Configure admin sign-in.
- [ ] Add server-side admin authorization helper.
- [ ] Protect `/admin`.
- [ ] Build inquiry list.
- [ ] Add filters/status.
- [ ] Build inquiry detail page.
- [ ] Allow reviewing/waitlisting/declining.
- [ ] Record timestamps/audit events as appropriate.

## Acceptance Criteria

- Non-admin cannot access admin pages or mutations.
- Admin can view all inquiries.
- Admin can safely change inquiry review status.

---

# 7. Phase 4 — Booking Approval, Pricing Snapshot, and Date Holds

## Objective

Convert approved inquiries into proposed bookings without double-booking the one booth.

## Tables

```text
bookings
booking_line_items
date_reservations
```

## Tasks

- [ ] Add current pricing config.
- [ ] Build admin approval UI.
- [ ] Allow admin to choose exact package/add-ons/prices.
- [ ] Calculate totals on server.
- [ ] Calculate and snapshot 30% retainer.
- [ ] Create transactional booking approval service.
- [ ] Create exclusive date reservation.
- [ ] Add hold expiration.
- [ ] Handle conflict when date already held/confirmed.
- [ ] Mark inquiry converted only on successful booking creation.
- [ ] Add booking detail admin page.
- [ ] Send approval/hold email.

## Must-Test Scenario

Two approval requests for the same event date execute concurrently.

Only one can create an active reservation.

## Acceptance Criteria

- Admin can approve an inquiry.
- Exact approved pricing is snapshotted.
- Hold is created.
- Another booking cannot reserve the same date.
- Hold expiration is visible.
- Retainer is exactly 30% of booking total.
- No payment is possible yet.

---

# 8. Phase 5 — Passwordless Client Access

## Objective

Give approved clients a private area without customer accounts/passwords.

## Tables

```text
client_magic_links
client_sessions
```

## Tasks

- [ ] Create secure random token utilities.
- [ ] Hash tokens before persistence.
- [ ] Send one-time client-access link.
- [ ] Build `/access/[token]` redemption.
- [ ] Create secure HTTP-only client session cookie.
- [ ] Build client authorization helper.
- [ ] Build `/client` booking overview.
- [ ] Add "request a new link" flow.
- [ ] Prevent email enumeration.
- [ ] Add session revocation/expiry.

## Acceptance Criteria

- Raw tokens are never stored.
- Token can be used only once.
- Expired token fails safely.
- Client can access only their booking.
- Client does not create a password.

---

# 9. Phase 6 — Contract System

## Objective

Require a preserved contract signature before payment.

## Tables

```text
contract_templates
contracts
```

## Tasks

- [ ] Add first versioned contract template.
- [ ] Render booking-specific contract snapshot.
- [ ] Hash snapshot content.
- [ ] Build contract-review page.
- [ ] Collect signed legal name + affirmative consent.
- [ ] Save signature evidence.
- [ ] Make signed contract immutable.
- [ ] Add superseding workflow.
- [ ] Disable deposit action until current contract is signed.

## Legal Gate

Before real paid commercial use:
- contract language,
- cancellation/rescheduling,
- retainer terminology,
- liability,
- media/data terms,
- electronic signature process

should receive appropriate California legal review.

## Acceptance Criteria

- Client can review and sign.
- Signed snapshot remains unchanged.
- Admin can see signed time/version.
- Unsigned client cannot start deposit payment.

---

# 10. Phase 7 — Stripe 30% Retainer

## Objective

Accept the retainer and confirm the booking safely.

## Tables

```text
payments
stripe_events
```

## Tasks

- [x] Configure Stripe test mode.
- [x] Implement server-only Checkout Session creation.
- [x] Validate booking eligibility.
- [x] Calculate amount from database data only.
- [x] Add internal IDs to Stripe metadata.
- [x] Build Stripe webhook endpoint.
- [x] Verify webhook signature.
- [x] Add event idempotency ledger.
- [x] Record payment.
- [x] Convert hold/reservation to confirmed after verified payment.
- [x] Build payment success/status page.
- [x] Send retainer-paid/booking-confirmed email.

## Critical Tests

- [x] Cannot create session without signed contract.
- [x] Cannot create session after hold expiration.
- [x] Browser success route alone does not confirm.
- [x] Duplicate webhook does not double-pay.
- [x] Wrong amount does not silently confirm.
- [x] Payment for conflicted/invalid hold is flagged for manual review.

## Acceptance Criteria

A test client can:
- sign current contract,
- pay 30% via Stripe test mode,
- receive confirmed booking state only after webhook processing.

---

# 11. Phase 8 — Client Customization

## Objective

Collect the information needed to prepare the booth.

## Tables

```text
booking_customizations
booking_prompts
```

## Fields

- display names,
- welcome-screen wording,
- recording prompts,
- signage text if applicable,
- notes.

No color selection in V1.

## Tasks

- [ ] Build customization form.
- [ ] Enforce package/service prompt limits.
- [ ] Save drafts or explicit submission.
- [ ] Add due date.
- [ ] Add admin lock/unlock.
- [ ] Add reminder email capability.
- [ ] Add admin preview of client selections.

## Acceptance Criteria

- Client can update customization before lock.
- Client cannot update after lock.
- Admin can review all selections.
- No color fields exist.

---

# 12. Phase 9 — Remaining Balance

## Objective

Collect the rest of the booking total.

## Business Gate

Before implementation, finalize:

```text
balance due date = TBD
```

## Tasks

- [ ] Calculate net paid amount.
- [ ] Calculate remaining balance.
- [ ] Add balance Checkout flow.
- [ ] Reuse webhook/idempotency architecture.
- [ ] Show paid/outstanding status in client/admin.
- [ ] Add reminder emails.

## Acceptance Criteria

- Amount comes from database.
- Payment is webhook-confirmed.
- Client cannot overpay through ordinary UI.
- Refund/adjustment history does not erase original payment records.

---

# 13. Phase 10 — R2 Media Upload

## Objective

Upload wedding media privately and reliably.

## Tables

```text
media_assets
```

## Infrastructure

- private Cloudflare R2 bucket
- CORS limited to intended origins
- server-only R2 credentials

## Tasks

- [ ] Configure R2.
- [ ] Create server-side object-key helper.
- [ ] Create admin upload authorization endpoint/action.
- [ ] Generate short-lived presigned PUT URLs.
- [ ] Upload directly browser -> R2.
- [ ] Persist metadata after successful upload.
- [ ] Support upload retry/recovery.
- [ ] Keep new assets hidden by default.

## Acceptance Criteria

- Large file bytes do not pass through a normal Vercel Function body.
- Bucket remains private.
- Only admin can request upload URLs.
- Media metadata is associated with correct booking.

---

# 14. Phase 11 — Private Gallery and Downloads

## Objective

Deliver recordings through the website.

## Tasks

- [ ] Build gallery page.
- [ ] Require client session.
- [ ] Show only booking-owned visible assets.
- [ ] Support browser-friendly video playback.
- [ ] Generate short-lived presigned GET URLs.
- [ ] Support individual downloads.
- [ ] Support a pre-built "Download All" archive asset.
- [ ] Add admin gallery publish/unpublish.
- [ ] Send gallery-published email.

## Acceptance Criteria

- Client A cannot access Client B assets.
- Copying a private application route without authorization fails.
- Presigned URLs expire.
- Gallery publication is an explicit admin action.
- Hidden assets do not appear.

---

# 15. Phase 12 — Launch Hardening

## Objective

Prepare for real paid customers.

## Tasks

- [ ] Production Stripe account/config.
- [ ] Production webhook verification.
- [ ] Production email domain.
- [ ] Production R2 bucket/config.
- [ ] Backup/recovery procedure.
- [ ] Error monitoring.
- [ ] Rate limiting where appropriate.
- [ ] Privacy policy.
- [ ] Terms/service agreement legal review.
- [ ] Consent/media-release language.
- [ ] Data-retention policy.
- [ ] Cancellation/rescheduling policy.
- [ ] Final balance due policy.
- [ ] Customization deadline.
- [ ] Delivery timeline.
- [ ] Media retention duration.
- [ ] Test full happy path.
- [ ] Test failure paths.
- [ ] Test on mobile Safari/Chrome.
- [ ] Test admin workflow from a real device.
- [ ] Confirm analytics avoids sensitive data.

## Acceptance Criteria

Run at least one complete test booking from a new inquiry through a published sample gallery with production-like configuration.

---

# 16. Phase 13 — First Real Events Feedback Loop

## Objective

Use real events to decide what software deserves to exist next.

After each event record:

- inquiry source,
- inquiry-to-booking conversion,
- selected package,
- add-ons,
- average booking value,
- setup/pickup time,
- editing time,
- delivery effort,
- number/size of recordings,
- customer questions,
- confusing website steps,
- vendor referral source.

Do not automate a painful process until the actual pain has been observed repeatedly.

---

# 17. Features Explicitly Deferred

Do not add during normal V1 implementation:

```text
customer passwords/accounts
multiple booths
same-day time-slot optimization
SMS
CRM integration
vendor portal
referral commission automation
automatic video transcoding
automatic highlight-film editing
real-time chat
complex discount engine
subscription billing
multi-currency
CMS
mobile app
AI video analysis
```

Any deferred feature requires:
1. a demonstrated business need,
2. an architecture review,
3. an update to this plan.

---

# 18. Business Decisions Needed Before Launch

Track these separately from coding completion.

- [ ] Finalize hold duration.
- [ ] Finalize remaining-balance due date.
- [ ] Finalize cancellation/refund policy.
- [ ] Finalize retainer/deposit legal terminology.
- [ ] Finalize rescheduling policy.
- [ ] Finalize customization lock date.
- [ ] Finalize delivery timeline.
- [ ] Finalize media-retention period.
- [ ] Finalize client session lifetime.
- [ ] Finalize launch pricing rules.
- [ ] Finalize launch add-ons.
- [ ] Finalize service area/travel fees.
- [ ] Finalize tax treatment with appropriate professional guidance.

---

# 19. Recommended First Claude Work Session

Do only Phase 0.

Suggested instruction:

```text
Read CLAUDE.md, ARCHITECTURE.md, BUSINESS_RULES.md, DATABASE.md, and PLAN.md.

Implement only PLAN.md Phase 0.

Do not implement inquiry, database, Stripe, authentication, R2, or email features yet.

Before editing files:
1. summarize the Phase 0 requirements,
2. inspect the existing repository,
3. identify any conflicts with the documented architecture.

Then make the minimum changes needed to satisfy Phase 0 acceptance criteria.

At the end:
- run lint/typecheck/build,
- report what changed,
- list any unresolved issues,
- do not begin Phase 1.
```

This keeps the agent from racing ahead and inventing unfinished systems.
