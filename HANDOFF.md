# Handoff — Memory Studio

Written by the agent that completed Phase 0 and Phase 1, for whichever agent picks up Phase 2 next.

## Read first

In this order, before touching architecture:

1. `CLAUDE.md` — primary instruction set, non-negotiable engineering rules, tech stack
2. `BUSINESS_RULES.md` — numbered business rules (BR-INQ, BR-AVL, BR-PRC, BR-PAY, etc.)
3. `ARCHITECTURE.md` — system boundaries, layering, domain modules
4. `DATABASE.md` — full schema, invariants, transaction pseudocode
5. `PLAN.md` — phased build plan; Phase 2 is next (Database and Inquiry System)

## Current state

- **Branch:** `main`, in sync with `origin/main` (`git rev-list --left-right --count origin/main...HEAD` → `0 0`)
- **Last commit:** `3b464ea` "Front End scaffolding" — contains all of Phase 0 + Phase 1
- **Working tree:** clean as of this handoff
- Note: this session never ran `git commit` itself — commits so far were made by the user outside this session (or by their own tooling). Don't assume you'll be asked to commit; per CLAUDE.md's standing rule, only commit when the user explicitly asks.

## What's done

### Phase 0 — Repository and Foundation
- Next.js 16.3.2, App Router, TypeScript strict, `src/` dir, `@/*` alias, Tailwind v4
- shadcn/ui initialized — **uses `@base-ui/react` under the hood, not Radix**. Composition uses a `render` prop instead of `asChild`, e.g.:
  ```tsx
  <Button render={<Link href="/inquiry" />}>Start Your Inquiry</Button>
  ```
  Keep using this pattern for any new Button/Link combos.
- `src/lib/env.ts` — Zod schemas (`serverEnvSchema`, `publicEnvSchema`) covering every variable category in CLAUDE.md's "Environment Variable Naming" section. All fields are currently `.optional()` because nothing consumes them yet. **As each phase wires up a real integration, tighten that specific field to required** rather than leaving broad optionality forever.
- `.env.example` mirrors the same categories.
- `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`). All pass as of last check.
- `next.config.ts` sets `agentRules: false`. **Do not remove this.** Next.js 16's dev/build process otherwise auto-generates an "agent rules" block and appends it directly into the repo's `CLAUDE.md` on first run (observed firsthand — it silently mutated the file). If you ever see a `<!-- BEGIN:nextjs-agent-rules -->` block appear in `CLAUDE.md`, strip it back out and confirm the config flag is still set.
- `.gitignore` has `.env*` followed by `!.env.example` — the blanket env rule would otherwise silently exclude the committed template too. Keep that exception if you add more `.env.*` files.

### Phase 1 — Marketing Website
Routes built under `src/app/(marketing)/`, all wrapped in a shared layout with responsive header (desktop nav + mobile hamburger) and footer:
- `/` — hero, value props, package preview, closing CTA
- `/how-it-works` — 6-step process
- `/packages` — Cocktail/Signature/Keepsake comparison + add-ons, pricing hardcoded as marketing copy (see note below)
- `/gallery` — placeholder grid, no real media (BR-MED rules — no fabricated customer content)
- `/faq` — accordion
- `/about` — placeholder brand copy, meant for the user to rewrite
- `/inquiry` — **informational only, not a working form.** It lists what info will be asked for but has no inputs and doesn't persist anything. The real form (React Hook Form + Zod, server validation, persistence) is explicitly Phase 2 scope per `PLAN.md` — don't treat `/inquiry` as already built.
- Per-page SEO metadata, title template in root layout, `@vercel/analytics` wired into root layout
- No payment or "Book Now" buttons anywhere — every CTA points to `/inquiry`, consistent with "customers cannot instantly book"

**Pricing note:** `/packages` hardcodes its display numbers directly in the page rather than reading from a shared config module. `PLAN.md` Phase 4 explicitly owns creating `src/config/pricing.ts` as the *authoritative* pricing source used by booking-approval logic. Don't conflate the two — if Phase 4 introduces that config, the marketing page can be updated to read from it then, but that's out of scope until Phase 4.

**Card layout gotcha:** package cards needed `h-full` on `Card` and `flex-1` on `CardContent` to keep footer buttons vertically aligned across cards with different numbers of feature bullets (grid stretch alone wasn't enough because nothing forced the content column to fill the stretched height). Reuse this pattern for any other card grids with variable-length content.

**JSX apostrophe gotcha:** `react/no-unescaped-entities` fires on literal apostrophes in JSX text nodes (needs `&apos;`), but *not* on apostrophes inside plain JS strings rendered via `{expression}` interpolation. Prefer the latter — put copy in a data array/object and interpolate it, rather than writing literal contractions directly between JSX tags.

## Verification status

- `npm run lint`, `npm run build`, `npm run typecheck`, `npm run test` all pass as of the last check in this session.
- No visual/browser QA was done by the agent — no headless Chromium/Playwright was available in that environment, and installing one wasn't authorized. The user reviewed the running dev server directly and requested one fix (package card button alignment, described above), which has been applied and re-verified via lint/build only, not re-screenshotted.
- Nothing has been deployed. No Vercel project has been created or linked — that requires the user's own account login, so it's a manual step, not something to attempt unilaterally.

## Next: Phase 2 — Database and Inquiry System

Per `PLAN.md` section 5. Objective: persist real inquiries.

Infrastructure needed:
- A Supabase project (URL + service role key) — **this requires the user's account/credentials. Ask before assuming one exists**, since nothing in this repo currently has real Supabase config.
- Drizzle ORM + initial migration for the `inquiries` table only (see `DATABASE.md` §3.1 for the full column list, enum, and index spec — don't build other tables yet, they belong to later phases per the phased plan).

Tasks (from `PLAN.md`):
- Configure database connection
- Create Drizzle schema/migration for `inquiries`
- Build the inquiry form with React Hook Form + Zod (this replaces the current placeholder content on `/inquiry`)
- Validate server-side (Zod again, not just client-side)
- Persist inquiry
- Add spam/abuse mitigation appropriate for launch
- Send inquiry-received email via Resend
- Show a success state that explicitly does **not** imply the date is reserved (BR-INQ-002)

Acceptance criteria: valid inquiry persists; invalid input is rejected safely; confirmation email sent; confirmation copy explicitly says the date isn't reserved yet; duplicate email inquiries are allowed (email is intentionally not unique — BR-INQ-007).

Before writing code, follow CLAUDE.md's "Change Discipline": re-check the Phase 2 section of `PLAN.md`, the BR-INQ-* rules in `BUSINESS_RULES.md`, and the `inquiries` table spec in `DATABASE.md` §3.1, since this handoff is a summary, not a substitute for those.

## Standing reminders

- Only commit when the user explicitly asks.
- Don't build features from later phases early (rule #17 in CLAUDE.md) — e.g., don't start on admin auth, holds, or contracts while doing Phase 2.
- This file (`HANDOFF.md`) is a one-time transfer note, not part of the permanent doc set listed in CLAUDE.md's "Read these files" list. Feel free to delete it once its contents are absorbed, or update it again at the next handoff.
