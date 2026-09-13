import { redirect } from "next/navigation";

import { getCurrentClient } from "@/server/auth/get-current-client";
import { getOrCreateCurrentContract } from "@/server/services/contracts";
import { Badge } from "@/components/ui/badge";
import { SignContractForm } from "./sign-contract-form";

export default async function ClientContractPage() {
  const current = await getCurrentClient();
  if (!current) {
    redirect("/access");
  }

  const contract = await getOrCreateCurrentContract(current.booking.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Contract</h1>
        <Badge variant={contract.status === "signed" ? "secondary" : "default"}>
          {contract.status === "signed" ? "Signed" : "Awaiting signature"}
        </Badge>
      </div>

      <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        This contract template is an engineering placeholder pending California legal review. It is not final.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm leading-relaxed whitespace-pre-wrap">
        {contract.renderedContent}
      </div>

      {contract.status === "signed" ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Signed by</dt>
            <dd>{contract.signedName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Signed on</dt>
            <dd>{new Date(contract.signedAt!).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd>{contract.versionNumber}</dd>
          </div>
        </dl>
      ) : (
        <SignContractForm defaultName={current.booking.primaryContactName} />
      )}
    </div>
  );
}
