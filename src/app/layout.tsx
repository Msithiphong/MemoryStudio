import type { Metadata } from "next";
import "./globals.css";
import { Cormorant_Garamond, Figtree, Pinyon_Script } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
});

const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: {
    default: "Memory Studio",
    template: "%s | Memory Studio",
  },
  description: "Premium wedding video and audio guest books.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        figtree.variable,
        cormorantGaramond.variable,
        pinyonScript.variable
      )}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
