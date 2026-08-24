import { cn } from "@/lib/utils";

export function PlaceholderBox({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid place-content-center gap-1 border border-dashed border-gold-600 bg-espresso-300 p-2 text-center text-[11px] font-semibold tracking-[0.1em] text-gold-800 uppercase",
        className
      )}
    >
      {label}
    </div>
  );
}
