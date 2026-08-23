import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "The story behind Memory Studio's wedding video and audio guest books.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">About Memory Studio</h1>
      <div className="mt-6 space-y-4 text-lg text-muted-foreground">
        <p>
          Memory Studio started with a simple idea: the messages guests leave at a wedding are as meaningful as the
          photos, and they deserve the same care.
        </p>
        <p>
          We run a single recording booth by design. Taking on one wedding per date means every couple gets our full
          attention, from setup through the private delivery of their finished films.
        </p>
        <p>
          If that sounds like a good fit for your celebration, we would love to hear about your day.
        </p>
      </div>
    </div>
  );
}
