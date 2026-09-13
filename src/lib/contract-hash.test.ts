import { describe, expect, it } from "vitest";
import { hashContractContent } from "./contract-hash";

const HEX_64 = /^[0-9a-f]{64}$/;

describe("hashContractContent", () => {
  it("produces a hex digest matching the DB constraint format", () => {
    expect(hashContractContent("some rendered content")).toMatch(HEX_64);
  });

  it("is deterministic for the same input", () => {
    expect(hashContractContent("a")).toBe(hashContractContent("a"));
  });

  it("produces different hashes for different content", () => {
    expect(hashContractContent("a")).not.toBe(hashContractContent("b"));
  });
});
