import { getDb } from "../src/lib/db";
import { contractTemplates } from "../src/lib/db/schema";

// BR-CON-007: contract wording must receive California legal review before commercial launch.
// This is an engineering placeholder skeleton, not reviewed legal language.
const PLACEHOLDER_CONTENT = `DRAFT — PENDING LEGAL REVIEW (BR-CON-007). This is an engineering placeholder, not an enforceable contract.

Memory Studio will provide {{packageName}} video/audio guest-book services for the wedding of {{clientName}} on {{eventDate}} (Booking Reference {{referenceCode}}).

Total contracted price: {{totalAmount}}. A retainer of {{retainerAmount}} is due to confirm this booking; the remaining balance is due before the event per Memory Studio's payment schedule.

Cancellation and rescheduling terms are not yet finalized and will be defined during legal review.

By signing below, the client acknowledges these placeholder terms, which will be replaced by a legally reviewed agreement before paid commercial launch.`;

async function main() {
  const db = getDb();
  await db
    .insert(contractTemplates)
    .values({
      version: "v0-placeholder-skeleton",
      name: "Standard Guest-Book Agreement (Placeholder — Pending Legal Review)",
      sourceFormat: "plaintext",
      sourceContent: PLACEHOLDER_CONTENT,
      isActive: true,
    })
    .onConflictDoNothing({ target: contractTemplates.version });

  console.log("Seeded contract template v0-placeholder-skeleton (or it already existed).");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
