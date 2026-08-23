# Handoff: Memory Studio — Marketing Home Page (design 2a, "Light & airy")

## Overview

The public marketing home page for **Memory Studio**, a premium wedding video/audio guest-book
service that rents one physical recording booth, one event per date. This design replaces the
current unstyled shadcn default at `src/app/(marketing)/page.tsx` with the brand's real visual
identity, and restyles the shared chrome (`site-header.tsx`, `site-footer.tsx`).

Business context lives in the repo's own docs — `CLAUDE.md`, `BUSINESS_RULES.md`,
`ARCHITECTURE.md`. Nothing in this design changes the booking rules: the home page never
reserves a date and never creates a Stripe session. Its only conversion action is
`/inquiry`.

## About the Design Files

`home-2a.html` is a **design reference created in HTML** — a prototype showing the intended
look, structure and copy. It is *not* production code to copy directly.

The task is to **recreate this design in the existing codebase**: Next.js 16 App Router,
TypeScript, Tailwind CSS v4 (`@theme inline` in `src/app/globals.css`), shadcn/ui components.
Use those established patterns — Tailwind utilities and the CSS custom properties in
`globals.css`, shadcn `Button` / `Card`, `next/font` for typefaces, `next/image` for
photography. Do not introduce a second styling system, and do not ship the raw HTML.

`organic-styles.css` is the design-system stylesheet the prototype was built on. It is
included **only so the prototype renders offline**. Do not add it to the app — instead port
its values into `globals.css` as tokens (see Design Tokens below).

## Fidelity

**High fidelity.** Colors, typography, spacing and copy are final. Recreate the UI faithfully.
Two caveats:

- All photography and the logo are **placeholders** (dashed boxes in the prototype). The real
  assets need to come from the client.
- The prototype is fixed at a 1180px desktop canvas. **Responsive behavior is not designed
  yet** — see "Responsive behavior".

## Screens / Views

### Home (`/`) — `src/app/(marketing)/page.tsx`

**Purpose:** explain the emotional value of the service, show the booth, present the three
packages, and drive the visitor to `/inquiry`.

**Page shell:** single column, max content width 1180px, centered. Every section uses a
72px horizontal gutter. Page background: Warm Ivory `#F6F0E7`.

Sections top to bottom:

#### 1. Header (`site-header.tsx`)

- Layout: flex row, `padding: 22px 72px`, `gap: 17.6px`, 1px bottom border in `#E2CDA9`.
- Left: logo image, 150 × 104px, `object-fit: contain`, `margin-right: auto`.
- Center/right: nav links — How It Works · Packages · Gallery · FAQ · About.
  11.5px, uppercase, `letter-spacing: .1em`, color inherits Deep Espresso;
  hover → Antique Gold `#A9824F`.
- Right: primary button "Start Your Inquiry" → `/inquiry`.
- Sticky behavior from the current implementation is fine to keep.

#### 2. Hero — centered

- Container: `text-align: center; padding: 76px 72px 0`.
- Eyebrow: `TIMELESS • ROMANTIC • UNFORGETTABLE` — 11.5px, uppercase,
  `letter-spacing: .34em`, color `#8A6839` (accent-700), margin 0.
- H1: 62px / line-height 1.14 / weight 300, Cormorant Garamond,
  `letter-spacing: -.005em`, `max-width: 19ch`, centered (`margin: 26px auto 0`).
  Copy: *"A video and audio guest book your future selves will treasure"* — the final word
  **treasure** is set in Pinyon Script at 74px, `line-height: .9`, color `#8A6839`.
- Subhead: 17px / 1.75, `max-width: 56ch`, `margin: 28px auto 0`,
  color = Deep Espresso at 76% opacity.
  Copy: *"Memory Studio brings a private recording booth to your wedding, so every guest can
  leave a message you'll actually watch again."*
- Button row: flex, `gap: 14px`, centered, `margin-top: 34px` — primary "Start Your Inquiry",
  secondary "See How It Works".
- Disclaimer: 13px / 1.7, `max-width: 52ch`, `margin: 22px auto 0`, Espresso at 58%.
  Copy: *"Submitting an inquiry doesn't reserve your date — every request is reviewed before
  booking."* This line is required by the product rules; keep it.

#### 3. Booth hero image + script line

- Container: `position: relative; margin-top: 64px; padding: 0 72px`,
  `display: flex; gap: 56px; align-items: center; justify-content: center`.
- Decorative circle, painted **behind** the content: absolutely positioned,
  `left: 50%; top: 120px; transform: translateX(-50%)`, 640 × 640px, `border-radius: 50%`,
  background Muted Sage tint `#F0F2EC` (accent-2-100).
- Photograph: 560px wide, `flex: none`, arched frame
  `border-radius: 280px 280px 20px 20px`, `overflow: hidden`, shadow `--shadow-lg`,
  image 700px tall, `object-fit: cover`.
  The image is **washed** — `filter: saturate(.6) contrast(.85) brightness(1.1) opacity(.94)` —
  so it sits back into the ivory page. Apply this to every content photograph.
- Script line to the right of the photo: Pinyon Script 34px / 1.4, `max-width: 16ch`,
  color `#8A6839`. Copy: *"Capturing the voices, laughs and love you'll want to relive
  forever."*

#### 4. Three value props

- 3-column grid, `gap: 48px`, `padding: 88px 72px 0`, `text-align: center`.
- Each column opens with a full-width 1px rule in Champagne `#D8C3A5`, `margin-bottom: 28px`.
- Title: Figtree (body font, **not** the serif), 15px, weight 600, uppercase,
  `letter-spacing: .16em`.
- Body: 15px / 1.8, `margin-top: 16px`, Espresso at 76%.
- Content: "One booth, your day only" / "Private by design" / "Made to keep" — copy verbatim
  from `src/app/(marketing)/page.tsx`'s `VALUE_PROPS`.

#### 5. "What your guests leave behind" — prompt cards

- Container: `padding: 96px 72px 0`, centered.
- Eyebrow 11.5px uppercase `letter-spacing: .3em` color `#8A6839`: "What your guests leave behind".
- H2: 40px weight 300, `max-width: 22ch`, centered: "Guided prompts, so nobody freezes on camera".
- 3-column grid, `gap: 28px`, `margin-top: 48px`. Each card: `border-radius: 20px`,
  `padding: 40px 32px`, 1px border, with a 40 × 1px centered divider (`margin: 24px auto`)
  between the quote and the attribution.
  - Card 1 — bg `#FBF7F1` (surface), border `#E2CDA9`, divider `#C4A377`.
  - Card 2 — bg `#E0E4DA` (sage-200), border `#A8B29C`, divider `#67705C`.
  - Card 3 — bg `#EFE1C9` (accent-200), border `#D8C3A5`, divider `#A9824F`.
- Quote: Cormorant Garamond 26px / 1.35, weight 400.
- Attribution: 12px uppercase `letter-spacing: .14em`, Espresso ~60%.
- Content: "How did you meet them?" / Aunt Rosa · 0:48 — "What should they never forget?" /
  Danny & Kim · 1:12 — "Give them one piece of advice." / Grandpa Vic · 0:33.
  **These are illustrative sample prompts**, not real customer data; confirm with the client
  before shipping, and never show real guest recordings on a public page.

#### 6. "The booth" band

- Full-bleed band: background `#F1E9DE` (neutral-200), `padding: 80px 72px`,
  `margin-top: 96px`.
- Centered eyebrow "The booth" + H2 40px weight 300: "Every detail, made to look like it belongs".
- 3-column grid, `gap: 44px 56px`, `margin-top: 56px`. Six items, each: serif H3 22px
  weight 400 + body 14.5px / 1.75 at 74% opacity, `margin-top: 10px`.
- Items (taken from the client's product sheet): Brass picture light · Arched interior molding ·
  Custom lettering · Framed iPad · Antique brass microphone · Floral styling.

#### 7. Packages

- `padding: 96px 72px 0`, centered. H2 40px weight 300 "Packages"; subhead 15.5px / 1.75,
  `max-width: 48ch`, 76% opacity: "Three starting points — every booking is customized after
  inquiry."
- 3-column grid, `gap: 28px`, `margin-top: 44px`. Each card is arch-topped:
  `border-radius: 160px 160px 12px 12px`, `padding: 56px 32px 40px`.
  - Cocktail / Keepsake — bg `#FBF7F1`, border 1px `#E2CDA9`.
  - Signature (featured) — bg Champagne `#D8C3A5`, border 1px `#A9824F`, shadow `--shadow-md`.
- Name: Figtree 14px weight 600 uppercase `letter-spacing: .2em`.
- Price: Cormorant Garamond 46px weight 300, `margin-top: 18px`.
- Blurb: 14.5px / 1.75, `margin-top: 18px`, 74% opacity (80% on the Champagne card).
- Prices: $499 / $699 / $949. **Read these from `src/config/pricing.ts`, never hard-code them**
  — per `CLAUDE.md` they are business configuration.
- Below the grid, `margin-top: 36px`: secondary button "Compare packages" → `/packages`.

#### 8. Closing CTA — espresso band

- Full-bleed, background Deep Espresso `#2C211B`, `padding: 88px 72px`, centered,
  `margin-top: 96px`.
- Eyebrow `TIMELESS • ROMANTIC • UNFORGETTABLE` — 11.5px uppercase `letter-spacing: .34em`,
  color Champagne `#D8C3A5` (accent-400).
- H2 42px weight 300, `max-width: 24ch`, color Warm Ivory `#F6F0E7`:
  "Ready to tell us about your day?"
- Body 16px / 1.75, `max-width: 48ch`, ivory at 74%:
  "Share your date and venue, and we'll follow up to confirm availability."
- Primary button "Start Your Inquiry", `margin-top: 32px`.

#### 9. Footer (`site-footer.tsx`)

- `padding: 56px 72px 44px`, flex row, `justify-content: space-between`, `gap: 40px`, wraps.
- Left: "MEMORY STUDIO" 11.5px weight 600 uppercase `letter-spacing: .3em`, then the
  existing description paragraph, 13.5px / 1.8 at 66% opacity, `max-width: 36ch`.
- Right: link list, flex wrap, `gap: 8px 28px`, 11.5px uppercase `letter-spacing: .1em`.
- Copyright row: `padding: 0 72px 40px`, 12px, Espresso at 52%. Year is computed.

## Interactions & Behavior

- All CTAs are plain navigations. "Start Your Inquiry" → `/inquiry`; "See How It Works" →
  `/how-it-works`; "Compare packages" → `/packages`.
- Buttons: primary hover → `#C4A377`; primary active → background `#A9824F`, text ivory.
  Secondary hover → Espresso at 7% over its ground; active → 14%.
- Nav links: hover → `#A9824F`.
- Focus: `outline: 2px solid var(--color-accent); outline-offset: 2px` on every interactive
  element — never the browser default ring.
- No animation in this design beyond the default color transitions. If you add any, respect
  `prefers-reduced-motion`.
- Keep the existing "Skip to content" link from `(marketing)/layout.tsx`.

## State Management

None. This is a fully static server-rendered page. The only client-side state is the existing
mobile-menu `open` boolean in `site-header.tsx`.

## Design Tokens

Add these to `src/app/globals.css` (they replace the current grayscale `oklch` defaults).
Roles are from the client's palette sheet.

| Token | Hex | Role |
| --- | --- | --- |
| Warm Ivory | `#F6F0E7` | main background, clean space |
| Champagne | `#D8C3A5` | accents, buttons, highlights |
| Soft Taupe | `#B7A796` | secondary backgrounds |
| Deep Espresso | `#2C211B` | headings, body text, dramatic sections |
| Muted Sage | `#7C8570` | floral / natural accent, used sparingly |
| Antique Gold | `#A9824F` | lines, icons, borders, details |

Surface: `#FBF7F1`. Divider: Antique Gold at 32% alpha.

Tonal ramps (used above by step number):

- neutral: `#FBF7F1` `#F1E9DE` `#E3D8C8` `#CFC0AD` `#B7A796` `#97887A` `#6E6154` `#4A3F35` `#2C211B`
- gold/champagne: `#F8F1E5` `#EFE1C9` `#E2CDA9` `#D8C3A5` `#C4A377` `#A9824F` `#8A6839` `#5F4726` `#3A2C18`
- sage: `#F0F2EC` `#E0E4DA` `#C9CFC0` `#A8B29C` `#7C8570` `#67705C` `#4F5747` `#383E32` `#23271F`

**Contrast note:** Antique Gold on Warm Ivory is a large-text / chrome value only. For
paragraph-size gold text use step 700 `#8A6839`. Champagne on ivory is decorative only.

**Typography**

- Display / headings: **Cormorant Garamond**, weights 300–600, italic available.
  Load via `next/font/google`. Headings in this design use weight 300 (large) or 400 (small).
- Body / UI: **Figtree**, weights 400/600/700. Also used for uppercase letterspaced labels.
- Script accent: **Pinyon Script**, one word or one line at a time. Never for UI or body copy.
- The repo currently loads Geist — replace it.
- Type scale used: 62 / 46 / 42 / 40 / 34 / 26 / 22 / 17 / 16 / 15.5 / 15 / 14.5 / 13.5 / 13 /
  12 / 11.5 px.

**Spacing** — section rhythm 96px between sections, 88px inside bands, 72px page gutter,
grid gaps 28 / 44 / 48 / 56px.

**Radius** — `8px` buttons/small, `20px` prompt cards, arch tops
`160px 160px 12px 12px` (package cards) and `280px 280px 20px 20px` (hero photo).

**Shadows**

- sm `0 1px 2px rgba(44,33,27,.10)`
- md `0 4px 16px rgba(44,33,27,.12)`
- lg `0 16px 48px rgba(44,33,27,.18)`

**Image treatment** — every content photograph gets
`filter: saturate(.6) contrast(.85) brightness(1.1) opacity(.94)`.

## Responsive behavior

Not designed. Suggested minimum before shipping:

- Below ~1024px: package cards, value props, prompt cards and booth-detail grid collapse
  3 → 2 → 1 column; the booth photo and the script line stack, photo first.
- Gutter shrinks from 72px to `clamp(20px, 5vw, 72px)`.
- H1 becomes `clamp(38px, 6vw, 62px)`.
- Keep the existing hamburger menu behavior in `site-header.tsx`.

Confirm with the designer before finalizing.

## Assets

Everything visual in the prototype is a **placeholder** (dashed box) and must be replaced:

| Placeholder | What goes there |
| --- | --- |
| Header logo, 150 × 104 | The Memory Studio wordmark — fine-line arch with wildflowers over spaced serif caps. **A clean SVG or transparent PNG is still needed**; the only file supplied so far is a photo of a laptop screen. |
| Hero photo, 560 × 700 | The booth: arched illuminated panel, brass picture light, framed iPad, brass microphone, florals, candlelight. |

No icons are used in this design — the rules and circles are CSS. If icons are added later,
the design system specifies Lucide at stroke-width 2.75.

## Files

- `home-2a.html` — the design reference. Open directly in a browser.
- `organic-styles.css` — the design-system stylesheet it renders against (reference only;
  port the values, don't ship the file).

Source of truth in the design project: `Memory Studio Website.dc.html`, option `2a`. Options
`2b` (dramatic espresso hero) and `2c` (editorial, annotated booth) exist there as
alternatives that were not chosen.

## Deviation to be aware of

The bound design system ("Organic") specifies Caprasimo — a chunky rounded display face — and
a terracotta/cream palette. Both were deliberately overridden here to match the client's own
brand: their palette sheet and their logo and booth lettering, which are spaced serif and
script. The system's *structure* (spacing scale, radii, component classes, washed imagery,
soft arch shapes) is retained.
