"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/packages", label: "Packages" },
  { href: "/gallery", label: "Gallery" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gold-300 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex max-w-[1180px] items-center gap-[17.6px] px-[clamp(20px,5vw,72px)] py-4 sm:py-[22px]">
        <Link href="/" className="mr-auto">
          <Image
            src="/assets/logos/Logo.png"
            alt="Memory Studio"
            width={104}
            height={104}
            priority
            unoptimized
            className="h-16 w-16 sm:h-[104px] sm:w-[104px]"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11.5px] tracking-[0.1em] text-foreground uppercase transition-colors hover:text-gold-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button variant="brand" size="brand" render={<Link href="/inquiry" />}>
            Check your Dates
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex size-9 items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="mx-auto flex max-w-[1180px] flex-col gap-1 border-t border-gold-300 px-[clamp(20px,5vw,72px)] py-3 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2 py-2 text-[11.5px] tracking-[0.1em] text-foreground uppercase hover:bg-muted hover:text-gold-600"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Button
            variant="brand"
            size="brand"
            render={<Link href="/inquiry" onClick={() => setOpen(false)} />}
            className="mt-2 w-full"
          >
            Check your Dates
          </Button>
        </nav>
      ) : null}
    </header>
  );
}
