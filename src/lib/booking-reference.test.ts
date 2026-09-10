import { describe, expect, it } from "vitest";
import { generateReferenceCode, REFERENCE_CODE_PATTERN } from "./booking-reference";

describe("generateReferenceCode", () => {
  it("matches the required format", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateReferenceCode()).toMatch(REFERENCE_CODE_PATTERN);
    }
  });

  it("excludes visually ambiguous characters", () => {
    const codes = Array.from({ length: 50 }, () => generateReferenceCode());
    const combined = codes.join("");
    expect(combined).not.toMatch(/[IO01L]/);
  });

  it("produces varied output, not a constant value", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferenceCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
