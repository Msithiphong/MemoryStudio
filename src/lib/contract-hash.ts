import { createHash } from "node:crypto";

export function hashContractContent(renderedContent: string): string {
  return createHash("sha256").update(renderedContent, "utf8").digest("hex");
}
