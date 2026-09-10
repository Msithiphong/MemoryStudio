import { randomInt } from "node:crypto";

// Deliberately excludes visually ambiguous characters (I, O, 0, 1, L).
const REFERENCE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERENCE_CODE_LENGTH = 7;

export const REFERENCE_CODE_PATTERN = /^MS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{7}$/;

export function generateReferenceCode(): string {
  let suffix = "";
  for (let i = 0; i < REFERENCE_CODE_LENGTH; i++) {
    suffix += REFERENCE_CODE_ALPHABET[randomInt(REFERENCE_CODE_ALPHABET.length)];
  }
  return `MS-${suffix}`;
}
