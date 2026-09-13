import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./client-token";

const HEX_64 = /^[0-9a-f]{64}$/;

describe("generateToken", () => {
  it("produces a high-entropy hex string", () => {
    expect(generateToken()).toMatch(HEX_64);
  });

  it("produces varied output", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateToken()));
    expect(tokens.size).toBe(20);
  });
});

describe("hashToken", () => {
  it("produces a hex digest matching the DB constraint format", () => {
    expect(hashToken(generateToken())).toMatch(HEX_64);
  });

  it("is deterministic for the same input", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });
});
