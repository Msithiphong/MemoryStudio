import { redirect } from "next/navigation";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { getOrCreateCustomizationView } from "@/server/services/customizations";
import { Badge } from "@/components/ui/badge";
import { CustomizeForm } from "./customize-form";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export default async function ClientCustomizePage() {
  const current = await getCurrentClient();
  if (!current) {
    redirect("/access");
  }

  const { customization, prompts, locked, signageApplicable } = await getOrCreateCustomizationView(current.booking.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Customize your guest book</h1>
        <Badge variant={locked ? "destructive" : customization.submittedAt ? "secondary" : "default"}>
          {locked ? "Locked" : customization.submittedAt ? "Submitted" : "Not submitted"}
        </Badge>
      </div>

      {current.booking.customizationDueAt ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Please finish this by{" "}
          {new Date(current.booking.customizationDueAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          .
        </p>
      ) : null}

      {locked ? (
        <>
          <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Customization is locked for this booking. Contact Memory Studio if you need to make a change.
          </p>
          <dl className="mt-6 space-y-4">
            <Field label="Display names" value={[customization.displayName1, customization.displayName2].filter(Boolean).join(" & ")} />
            <Field label="Welcome-screen message" value={customization.welcomeMessage} />
            {signageApplicable ? <Field label="Signage wording" value={customization.signageText} /> : null}
            <Field
              label="Recording prompts"
              value={prompts.length > 0 ? prompts.map((p) => p.promptText).join("\n") : null}
            />
            <Field label="Notes to Memory Studio" value={customization.clientNotes} />
          </dl>
        </>
      ) : (
        <CustomizeForm
          maxPrompts={customization.maxPrompts}
          signageApplicable={signageApplicable}
          defaultValues={{
            displayName1: customization.displayName1 ?? "",
            displayName2: customization.displayName2 ?? "",
            welcomeMessage: customization.welcomeMessage ?? "",
            signageText: customization.signageText ?? "",
            clientNotes: customization.clientNotes ?? "",
            prompts: prompts.map((p) => p.promptText),
          }}
        />
      )}
    </div>
  );
}
