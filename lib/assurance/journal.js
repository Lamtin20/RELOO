import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  verify,
} from "node:crypto";
import canonicalize from "canonicalize";
const HEX = /^[a-f0-9]{64}$/;
export function digest(value) {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}
export function journalKey(privateBase64) {
  if (!privateBase64) throw new Error("JOURNAL_KEY_NOT_CONFIGURED");
  const privateKey = createPrivateKey({
    key: Buffer.from(privateBase64, "base64"),
    type: "pkcs8",
    format: "der",
  });
  if (privateKey.asymmetricKeyType !== "ed25519")
    throw new Error("JOURNAL_KEY_INVALID");
  const publicKey = createPublicKey(privateKey)
    .export({ type: "spki", format: "der" })
    .toString("base64");
  return {
    privateKey,
    publicKey,
    keyId: createHash("sha256").update(publicKey).digest("hex"),
  };
}
export function trustedJournalKeys(config=process.env){const key=journalKey(config.RELOO_JOURNAL_PRIVATE_KEY);return {[key.keyId]:key.publicKey};}
export function sealEntry(
  { streamId, sequence, event, previousHash, payload, recordedAt },
  privateBase64,
) {
  if (
    !/^[a-f0-9-]{36}$/i.test(streamId) ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    !HEX.test(previousHash) ||
    !Number.isFinite(Date.parse(recordedAt))
  )
    throw new Error("INVALID_HISTORY_ENVELOPE");
  const key = journalKey(privateBase64),
    salt = randomBytes(32).toString("hex"),
    payloadHash = digest({ salt, payload });
  const envelope = {
    version: 1,
    streamId,
    sequence,
    event,
    previousHash,
    payloadHash,
    recordedAt,
  };
  const hash = digest(envelope),
    signature = sign(null, Buffer.from(hash, "hex"), key.privateKey).toString(
      "base64",
    );
  return {
    envelope,
    hash,
    signature,
    keyId: key.keyId,
    publicKey: key.publicKey,
    privatePayload: { salt, payload },
  };
}
export function verifyHistory(entries, keys, checkpoint = null) {
  let previous = "0".repeat(64),
    sequence = 0;
  for (const entry of entries) {
    try {
      if (
        entry.envelope.sequence !== ++sequence ||
        entry.envelope.previousHash !== previous ||
        entry.hash !== digest(entry.envelope) ||
        !HEX.test(entry.hash)
      )
        return { ok: false, code: "CHAIN_CHANGED", sequence };
      const publicKey = keys[entry.keyId];
      if (
        !publicKey ||
        createHash("sha256").update(publicKey).digest("hex") !== entry.keyId
      )
        return { ok: false, code: "KEY_UNRECOGNIZED", sequence };
      if (
        !verify(
          null,
          Buffer.from(entry.hash, "hex"),
          createPublicKey({
            key: Buffer.from(publicKey, "base64"),
            type: "spki",
            format: "der",
          }),
          Buffer.from(entry.signature, "base64"),
        )
      )
        return { ok: false, code: "SIGNATURE_INVALID", sequence };
      if (
        entry.privatePayload &&
        digest(entry.privatePayload) !== entry.envelope.payloadHash
      )
        return { ok: false, code: "PAYLOAD_CHANGED", sequence };
      if (entry.envelope.streamId !== entries[0].envelope.streamId)
        return { ok: false, code: "STREAM_CHANGED", sequence };
      previous = entry.hash;
    } catch {
      return { ok: false, code: "HISTORY_UNREADABLE", sequence };
    }
  }
  if (
    checkpoint &&
    (checkpoint.count !== sequence || checkpoint.head !== previous)
  )
    return { ok: false, code: "CHECKPOINT_MISMATCH", sequence };
  return { ok: true, head: previous, count: sequence };
}
