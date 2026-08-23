import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Your Inquiry",
  description: "Tell Memory Studio about your wedding day to check availability.",
};

const WHAT_WE_ASK = [
  "Your name and your partner's name",
  "Your wedding date and venue",
  "Estimated guest count",
  "Which package interests you",
  "Anything else we should know",
];

export default function InquiryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Start Your Inquiry</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Our guided inquiry form is almost ready. In the meantime, here is what we will ask for so you can have it on
        hand.
      </p>

      <ul className="mt-8 space-y-2 text-muted-foreground">
        {WHAT_WE_ASK.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-muted-foreground">
        Sending an inquiry does not reserve your date. We review every request and follow up to confirm availability
        before anything is booked.
      </p>
    </div>
  );
}
