import { encryptPrivate, decryptPrivate } from "../operations/crypto.js";
import { sealEntry, verifyHistory, trustedJournalKeys } from "./journal.js";
import { integrationConfig } from "../operations/integrations.js";
import { readEvmCheckpoint } from "./evm.js";
export function rentalRecord(agreement, actor, event, payload) {
  const sealed = sealEntry(
    {
      streamId: agreement.id,
      sequence: agreement.sequence + 1,
      event,
      previousHash: agreement.head_hash,
      payload: { actorId: actor, ...payload },
      recordedAt: new Date().toISOString(),
    },
    process.env.RELOO_JOURNAL_PRIVATE_KEY,
  );
  return {
    envelope: sealed.envelope,
    hash: sealed.hash,
    signature: sealed.signature,
    keyId: sealed.keyId,
    encrypted: encryptPrivate(JSON.stringify(sealed.privatePayload)),
  };
}
export async function rentalHistory(db, agreement) {
  const { data: snapshot, error } = await db.rpc("reloo_rental_snapshot", {
    p_id: agreement.id,
  });
  if (error || !snapshot) throw new Error("HISTORY_UNAVAILABLE");
  const rows = snapshot.events,
    head = snapshot.agreement;
  let integrity,
    verifiedPayloads=[],
    checkpoint = null,
    checkpointUnavailable = false;
  try {
    const entries = rows.map((row) => ({
      envelope: row.envelope,
      hash: row.digest,
      signature: row.signature,
      keyId: row.signing_key_id,
      privatePayload: JSON.parse(decryptPrivate(row.payload_encrypted)),
    }));
    integrity = verifyHistory(entries, trustedJournalKeys(), {
      head: head.head_hash,
      count: head.sequence,
    });
    if(integrity.ok)verifiedPayloads=entries.map(entry=>({event:entry.envelope.event,payload:entry.privatePayload.payload}));
  } catch {
    integrity = { ok: false, code: "HISTORY_UNREADABLE" };
  }
  if (integrity.ok) {
    try {
      checkpoint = await readEvmCheckpoint(
        agreement.id,
        await integrationConfig(db, "EVM"),
      );
      if (
        checkpoint &&
        checkpoint.count > 0 &&
        (checkpoint.count > rows.length ||
          rows[checkpoint.count - 1]?.digest !== checkpoint.head)
      )
        integrity = { ok: false, code: "EVM_CHECKPOINT_MISMATCH" };
    } catch {
      checkpointUnavailable = true;
    }
  }
  if (!integrity.ok) {
    const prior = await db
      .from("integrity_incidents")
      .select("id")
      .eq("resource_id", agreement.id)
      .eq("code", "RENTAL_HISTORY_CHANGED")
      .eq("status", "REVIEW")
      .limit(1);
    if (!prior.data?.length)
      await db.from("integrity_incidents").insert({
        resource_id: agreement.id,
        code: "RENTAL_HISTORY_CHANGED",
        evidence: { verification: integrity.code },
      });
  }
  return {
    agreement: head,
    returnPolicy:integrity.ok?verifiedPayloads.find(entry=>entry.event==='PROPOSED')?.payload?.returnPolicy||null:null,
    returnAssessment:integrity.ok?verifiedPayloads.find(entry=>entry.event==='RETURN_CONFIRMED')?.payload?.returnAssessment||null:null,
    integrity,
    checkpoint,
    checkpointUnavailable,
    confirmations: snapshot.confirmations,
    events: rows.map(
      ({ payload_encrypted, envelope, signature, signing_key_id, ...row }) => ({
        ...row,
        anchor: snapshot.anchors.find(
          (anchor) => anchor.history_id === row.id,
        ) || { status: "PENDING_CONFIG" },
      }),
    ),
  };
}
