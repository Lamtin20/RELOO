import { decryptPrivate } from "../operations/crypto.js";
import { verifyHistory, trustedJournalKeys } from "../assurance/journal.js";
export function verifyFinancialSource(source) {
  try {
    const payload = JSON.parse(decryptPrivate(source.evidence_encrypted)),
      entry = {
        envelope: source.evidence_envelope,
        hash: source.evidence_hash,
        signature: source.signature,
        keyId: source.signing_key_id,
        privatePayload: payload,
      },
      result = verifyHistory([entry], trustedJournalKeys());
    const evidence = payload.payload.verified;
    return (
      result.ok &&
      entry.envelope.streamId === source.id &&
      evidence.providerId === source.provider_id &&
      evidence.accountId === source.bank_account_id &&
      evidence.type.toUpperCase() === source.direction &&
      String(evidence.amount) === String(source.amount)
    );
  } catch {
    return false;
  }
}
