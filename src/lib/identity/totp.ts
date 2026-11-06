import { createHmac } from "crypto";

function hotp(secret: Buffer, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function totpCode(secretBase32: string, at = Date.now()) {
  const clean = secretBase32.replace(/=+$/g, "").toUpperCase();
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return hotp(Buffer.from(bytes), Math.floor(at / 30_000));
}

export function verifyTotp(secretBase32: string, token: string) {
  const clean = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const now = Date.now();
  return [-1, 0, 1].some((step) => totpCode(secretBase32, now + step * 30_000) === clean);
}
