import { describe, expect, it } from "vitest";
import { renderContractTemplate } from "./contract-render";

describe("renderContractTemplate", () => {
  it("interpolates known fields", () => {
    const result = renderContractTemplate("Hello {{name}}, your total is {{total}}.", {
      name: "Jamie",
      total: "$699",
    });
    expect(result).toBe("Hello Jamie, your total is $699.");
  });

  it("interpolates the same field used multiple times", () => {
    const result = renderContractTemplate("{{name}} and {{name}}", { name: "Alex" });
    expect(result).toBe("Alex and Alex");
  });

  it("throws on an unresolved placeholder", () => {
    expect(() => renderContractTemplate("Hello {{missing}}", {})).toThrow(/missing/);
  });
});
