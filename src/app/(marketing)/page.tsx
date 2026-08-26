import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PlaceholderBox } from "@/components/placeholder-box";
import { PACKAGES, formatPrice } from "@/config/pricing";

const EYEBROW = "Timeless • Romantic • Unforgettable";

const VALUE_PROPS = [
  {
    title: "One booth, your day only",
    description:
      "We take a single event per date, so your guest book gets our full attention from setup to delivery.",
  },
  {
    title: "Private by design",
    description:
      "Your recordings are delivered through a secure, personal link. Nothing is public unless you choose to share it.",
  },
  {
    title: "Made to keep",
    description:
      "Every message is preserved as a lasting film you can revisit for anniversaries to come.",
  },
];

const PROMPT_CARDS = [
  {
    quote: "How did you meet them?",
    attribution: "Aunt Rosa • 0:48",
    bg: "bg-card",
    border: "border-gold-300",
    divider: "bg-gold-500",
    attributionOpacity: "text-foreground/60",
  },
  {
    quote: "What should they never forget?",
    attribution: "Danny & Kim • 1:12",
    bg: "bg-sage-200",
    border: "border-sage-400",
    divider: "bg-sage-600",
    attributionOpacity: "text-foreground/62",
  },
  {
    quote: "Give them one piece of advice.",
    attribution: "Grandpa Vic • 0:33",
    bg: "bg-gold-200",
    border: "border-gold-400",
    divider: "bg-gold-600",
    attributionOpacity: "text-foreground/62",
  },
];

const BOOTH_DETAILS = [
  {
    title: "Brass picture light",
    description: "A warm gallery light over the arch, so faces read beautifully after dark.",
  },
  {
    title: "Arched interior molding",
    description: "Hand-finished molding with a soft LED glow that draws guests in.",
  },
  {
    title: "Custom lettering",
    description: "Your names and date, set in the booth's own hand. Optional.",
  },
  {
    title: "Screen",
    description: "The screen sits in a gilt frame, so it reads as a piece of art, not a kiosk.",
  },
  {
    title: "Antique brass microphone",
    description: "On a braided cord — guests pick it up and know exactly what to do.",
  },
  {
    title: "Floral styling",
    description: "Blooms and greenery matched to your palette. Available as an add-on.",
  },
];

const GUTTER = "px-[clamp(20px,5vw,72px)]";
const CONTAINER = "mx-auto max-w-[1180px]";

export default function Home() {
  return (
    <>
      <div className={CONTAINER}>
        {/* Hero */}
        <section className={`${GUTTER} pt-16 text-center sm:pt-[76px]`}>
          <p className="text-[11.5px] tracking-[0.34em] text-gold-700 uppercase">{EYEBROW}</p>
          <h1 className="font-heading mx-auto mt-6 max-w-[19ch] text-[clamp(38px,6vw,62px)] leading-[1.14] font-light tracking-[-0.005em] text-balance">
            A video and audio guest book your future selves will{" "}
            <span className="font-script text-[clamp(48px,8vw,74px)] leading-[0.9] text-gold-700">
              treasure
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-[56ch] text-[17px] leading-[1.75] text-foreground/76">
            Memory Studio brings a private video guestbook to your wedding, where the people you love leave stories,
            advice, laughter, and messages you&apos;ll replay for years.
          </p>
          <div className="mt-[34px] flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button variant="brand" size="brand" render={<Link href="/inquiry" />}>
              Check your Dates
            </Button>
            <Button variant="brand-outline" size="brand" render={<Link href="/how-it-works" />}>
              See How It Works
            </Button>
          </div>
          <p className="mx-auto mt-[22px] max-w-[52ch] text-[13px] leading-[1.7] text-foreground/58">
            Submitting an inquiry doesn&apos;t reserve your date — every request is reviewed before booking.
          </p>
        </section>

        {/* Booth hero image + script line */}
        <section
          className={`relative mt-16 flex flex-col items-center justify-center gap-10 ${GUTTER} lg:flex-row lg:gap-14`}
        >
          <div
            aria-hidden
            className="absolute top-[60px] left-1/2 hidden size-[640px] -translate-x-1/2 rounded-full bg-sage-100 sm:block lg:top-[120px]"
          />
          <div className="relative w-full max-w-[560px] flex-none overflow-hidden rounded-[280px_280px_20px_20px] shadow-lg">
            <PlaceholderBox
              label="Booth photograph — arched panel, florals, candlelight"
              className="washed-photo h-[440px] w-full sm:h-[700px]"
            />
          </div>
          <p className="relative max-w-[16ch] font-script text-[28px] leading-[1.4] text-gold-700 sm:text-[34px]">
            Capturing the voices, laughs and love you&apos;ll want to relive forever.
          </p>
        </section>

        {/* Three value props */}
        <section className={`grid grid-cols-1 gap-12 ${GUTTER} pt-16 text-center sm:grid-cols-3 sm:pt-[88px]`}>
          {VALUE_PROPS.map((item) => (
            <div key={item.title}>
              <div className="mb-7 h-px w-full bg-gold-400" />
              <h3 className="font-sans text-[15px] font-semibold tracking-[0.16em] uppercase">{item.title}</h3>
              <p className="mt-4 text-[15px] leading-[1.8] text-foreground/76">{item.description}</p>
            </div>
          ))}
        </section>

        {/* What your guests leave behind */}
        <section className={`${GUTTER} pt-20 text-center sm:pt-24`}>
          <p className="text-[11.5px] tracking-[0.3em] text-gold-700 uppercase">
            What your guests leave behind
          </p>
          <h2 className="font-heading mx-auto mt-5 max-w-[22ch] text-[40px] font-light">
            Guided prompts, so nobody freezes on camera
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-7 text-center sm:grid-cols-3">
            {PROMPT_CARDS.map((card) => (
              <div key={card.quote} className={`rounded-[20px] border ${card.bg} ${card.border} px-8 py-10`}>
                <p className="font-heading text-2xl leading-[1.35] font-normal sm:text-[26px]">
                  &ldquo;{card.quote}&rdquo;
                </p>
                <div className={`mx-auto my-6 h-px w-10 ${card.divider}`} />
                <p className={`text-xs tracking-[0.14em] uppercase ${card.attributionOpacity}`}>
                  {card.attribution}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* The booth band — full-bleed */}
      <section className="mt-24 bg-espresso-200 py-20">
        <div className={`${CONTAINER} ${GUTTER}`}>
          <div className="text-center">
            <p className="text-[11.5px] tracking-[0.3em] text-gold-700 uppercase">The booth</p>
            <h2 className="font-heading mt-5 text-[40px] font-light">Every detail, made to look like it belongs</h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-x-14 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {BOOTH_DETAILS.map((item) => (
              <div key={item.title}>
                <h3 className="font-heading text-[22px] font-normal">{item.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-[1.75] text-foreground/74">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={CONTAINER}>
        {/* Packages */}
        <section className={`${GUTTER} pt-20 text-center sm:pt-24`}>
          <h2 className="font-heading text-[40px] font-light">Packages</h2>
          <p className="mx-auto mt-3.5 max-w-[48ch] text-[15.5px] leading-[1.75] text-foreground/76">
            Three starting points — every booking is customized after inquiry.
          </p>
          <div className="mt-11 grid grid-cols-1 gap-7 sm:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <Link
                key={pkg.id}
                href="/packages"
                className={
                  pkg.featured
                    ? "relative rounded-[160px_160px_12px_12px] border border-gold-600 bg-primary px-8 pt-14 pb-10 shadow-md outline-none transition-shadow hover:shadow-lg focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    : "rounded-[160px_160px_12px_12px] border border-gold-300 bg-card px-8 pt-14 pb-10 outline-none transition-shadow hover:shadow-lg focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                }
              >
                {pkg.featured ? (
                  <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-accent-foreground uppercase shadow-sm">
                    Most Popular
                  </span>
                ) : null}
                <h3 className="font-sans text-sm font-semibold tracking-[0.2em] uppercase">{pkg.name}</h3>
                <p className="mt-4.5 font-heading text-[46px] font-light">{formatPrice(pkg.priceCents)}</p>
                <p
                  className={
                    pkg.featured
                      ? "mt-4.5 text-[14.5px] leading-[1.75] text-foreground/80"
                      : "mt-4.5 text-[14.5px] leading-[1.75] text-foreground/74"
                  }
                >
                  {pkg.blurb}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-9">
            <Button variant="brand-outline" size="brand" render={<Link href="/packages" />}>
              Compare packages
            </Button>
          </div>
        </section>
      </div>

      {/* Closing CTA — full-bleed */}
      <section className="mt-24 bg-espresso-900 py-[88px] text-center">
        <div className={`${CONTAINER} ${GUTTER}`}>
          <p className="text-[11.5px] tracking-[0.34em] text-gold-400 uppercase">{EYEBROW}</p>
          <h2 className="font-heading mx-auto mt-6 max-w-[24ch] text-[42px] font-light text-background">
            Let's preserve the people who make your day unforgettable.
          </h2>
          <p className="mx-auto mt-4.5 max-w-[48ch] text-base leading-[1.75] text-background/74">
            Share your date and venue, and we&apos;ll follow up to confirm availability.
          </p>
          <div className="mt-8">
            <Button variant="brand" size="brand" render={<Link href="/inquiry" />}>
              Check your Dates
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
