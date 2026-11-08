// Optional transports have no automatic fallback to a real email/SMS service.
// Only fixed adapters supplied by server configuration may dispatch. No URLs in jobs.
export const CHANNELS = {
  inApp: { available: true, mode: "TRANSACTIONAL_OUTBOX" },
  push: { available: false, code: "PUSH_ADAPTER_NOT_CONFIGURED" },
  email: {
    available: false,
    code: "NEIGHBORHOOD_EMAIL_CONSENT_NOT_CONFIGURED",
  },
  sms: { available: false, code: "SMS_ADAPTER_NOT_CONFIGURED" },
};
export async function dispatchOptionalChannel(
  { channel, payload },
  { adapters = {}, consented = false } = {},
) {
  if (!["push", "email", "sms"].includes(channel) || !consented)
    throw Error("CHANNEL_CONSENT_REQUIRED");
  const adapter = adapters[channel];
  if (!adapter?.send || !adapter?.idempotencySupported)
    throw Error("CHANNEL_NOT_CONFIGURED");
  if (
    !payload.eventId ||
    !payload.dedupKey ||
    typeof payload.title !== "string" ||
    !payload.link?.startsWith("/noi-khu")
  )
    throw Error("INVALID_INPUT");
  // The adapter owns delivery receipts/reconciliation; caller must never blindly retry.
  return adapter.send({
    eventId: payload.eventId,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    deduplicationKey: payload.dedupKey,
  });
}
