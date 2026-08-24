import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/packages", label: "Packages" },
  { href: "/gallery", label: "Gallery" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/inquiry", label: "Start Your Inquiry" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="mx-auto flex max-w-[1180px] flex-col flex-wrap justify-between gap-10 px-[clamp(20px,5vw,72px)] pt-14 pb-11 sm:flex-row">
        <div className="max-w-[36ch] space-y-3">
          <p className="text-[11.5px] font-semibold tracking-[0.3em] text-foreground uppercase">
            Memory Studio
          </p>
          <p className="text-[13.5px] leading-[1.8] text-foreground/66">
            A private video and audio guest book for your wedding day, delivered securely after the celebration.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-start gap-x-7 gap-y-2 text-[11.5px] tracking-[0.1em] uppercase"
        >
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-foreground hover:text-gold-600">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,72px)] pb-10 text-xs text-foreground/52">
        © {year} Memory Studio. All rights reserved.
      </div>
    </footer>
  );
}
