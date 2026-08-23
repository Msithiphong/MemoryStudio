import type { Metadata } from "next";
import { Play } from "lucide-react";

export const metadata: Metadata = {
  title: "Gallery",
  description: "A preview of the wedding films Memory Studio creates.",
};

const PLACEHOLDER_COUNT = 6;

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Gallery</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        We are building out a portfolio of real wedding films from couples who have shared their permission. Check
        back soon to see examples.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex aspect-video items-center justify-center rounded-xl bg-muted/60 text-muted-foreground"
          >
            <Play className="size-8" aria-hidden="true" />
            <span className="sr-only">Sample coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
