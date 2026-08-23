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
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Memory Studio</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            A private video and audio guest book for your wedding day, delivered securely after the celebration.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground">
        © {year} Memory Studio. All rights reserved.
      </div>
    </footer>
  );
}
