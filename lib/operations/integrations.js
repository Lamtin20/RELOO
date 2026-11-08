import { decryptPrivate } from "./crypto.js";
const SECRET_KEYS = {
  VIBI_NEWS: ['VIBI_API_KEY','VIBI_BASE_URL','VIBI_TEXT_MODEL','VIBI_IMAGE_MODEL'],
  VNPT: ["VNPT_TOKEN_ID", "VNPT_TOKEN_KEY", "VNPT_ACCESS_TOKEN"],
  SEPAY: ["SEPAY_API_KEY", "SEPAY_WEBHOOK_KEY", "SEPAY_EINVOICE_TOKEN"],
  EVM: ["EVM_RPC_URL", "EVM_PRIVATE_KEY"],
  TWENTY: ["TWENTY_API_TOKEN"],
  GMAIL: ["GMAIL_CLIENT_ID","GMAIL_CLIENT_SECRET","GMAIL_REFRESH_TOKEN"],
};
export async function integrationConfig(db, provider) {
  const { data, error } = await db
    .from("integration_settings")
    .select("config,secrets_encrypted,health")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error("INTEGRATION_STORAGE_UNAVAILABLE");
  const secrets = data?.secrets_encrypted
    ? JSON.parse(decryptPrivate(data.secrets_encrypted))
    : {};
  return {
    ...Object.fromEntries(
      (SECRET_KEYS[provider] || []).map((key) => [key, process.env[key] || ""]),
    ),
    ...data?.config,
    ...secrets,
    health:data?.health||{},
  };
}
export function integrationReadiness(provider, config, now = Date.now()) {
  const missing = (SECRET_KEYS[provider] || []).filter((key) => !config[key]);
  if(provider==='GMAIL'&&!config.sender)missing.push('sender');
  if (provider === "VNPT") {
    const paused = process.env.RELOO_KYC_MODE !== 'VNPT';
    let expiresAt = null;
    try {
      expiresAt =
        JSON.parse(
          Buffer.from(
            String(config.VNPT_ACCESS_TOKEN)
              .replace(/^bearer\s+/i, "")
              .split(".")[1],
            "base64url",
          ).toString(),
        ).exp * 1000;
    } catch {}
    return {
      configured: missing.length === 0,
      ready:
        !paused && missing.length === 0 && Number.isFinite(expiresAt) && expiresAt > now&&config.health?.status==='OK',
      paused,
      missing,
      healthStatus:paused ? 'PAUSED' : config.health?.status||'NOT_VERIFIED',
      expiresAt: Number.isFinite(expiresAt)
        ? new Date(expiresAt).toISOString()
        : null,
    };
  }
  return {
    configured: missing.length === 0,
    ready: missing.length === 0,
    missing,
  };
}
export { SECRET_KEYS };
