import crypto from "crypto";

/**
 * Xác thực webhook Goship (x-goship-hmac-sha256)
 * @see https://doc.goship.io/api/shipment/webhooks
 */
export function verifyGoshipWebhook(data, webhookHmac, clientSecret) {
  if (!webhookHmac || !clientSecret || data == null) return false;

  const hashed = crypto
    .createHmac("sha256", clientSecret)
    .update(JSON.stringify(data))
    .digest();

  const compared = Buffer.from(hashed).toString("base64");
  const received = String(webhookHmac).trim();

  try {
    return crypto.timingSafeEqual(Buffer.from(compared), Buffer.from(received));
  } catch {
    return compared === received;
  }
}
