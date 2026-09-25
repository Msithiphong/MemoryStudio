import type { Package } from "./pricing";

/**
 * BR-CUS-003 defaults, used only when a booking's customization row is first created.
 * An admin can raise or lower the stored limit per booking afterward — "exact limits
 * may be adjusted administratively" (BUSINESS_RULES.md).
 */
export const DEFAULT_PROMPT_LIMITS: Record<Package["id"], number> = {
  moment: 3,
  signature: 5,
  // BUSINESS_RULES.md only says "at least Signature-level customization" for Keepsake —
  // no larger number is specified, so it starts at the Signature default and an admin
  // can raise it per booking if the package should offer more.
  keepsake: 5,
};

const DEFAULT_FALLBACK_LIMIT = DEFAULT_PROMPT_LIMITS.moment;

/** Reads the package id out of a line item's `package.<id>` catalog key (see the approve form). */
export function defaultPromptLimitForPackageCatalogKey(catalogKey: string | null | undefined): number {
  const id = catalogKey?.replace(/^package\./, "");
  return (id && id in DEFAULT_PROMPT_LIMITS ? DEFAULT_PROMPT_LIMITS[id as Package["id"]] : undefined) ?? DEFAULT_FALLBACK_LIMIT;
}
