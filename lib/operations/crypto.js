import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function key() {
  const value = process.env.RELOO_PRIVATE_DATA_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error("Private data encryption is not configured");
  return Buffer.from(value, "hex");
}
export function encryptPrivate(value) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}
export function decryptPrivate(value) {
  const buffer = Buffer.from(value, "base64"), decipher = createDecipheriv("aes-256-gcm", key(), buffer.subarray(0, 12));
  decipher.setAuthTag(buffer.subarray(12, 28));
  return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8");
}
export function privateHash(kind, value) {
  return createHmac("sha256", key()).update(`${kind}:${value}`).digest("hex");
}
