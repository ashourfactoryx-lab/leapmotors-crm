import { randomInt } from "node:crypto";

// Avoids visually ambiguous characters (0/O, 1/l/I) since these are read
// off a screen and typed back in by whoever the admin hands them to.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
