import { createHash } from "node:crypto";
import { securityDb } from "@/lib/security/service";
import { integrationConfig } from "@/lib/operations/integrations";
import { encryptPrivate } from "@/lib/operations/crypto";
import {
  normalizeSePayWebhook,
  verifySePaySignature,
} from "@/lib/finance/sepay";
export async function POST(request) {
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ success: false }, { status: 400 });
    let size = 0;
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 24000) {
        await reader.cancel();
        return Response.json({ success: false }, { status: 413 });
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks),
      db = securityDb(),
      config = await integrationConfig(db, "SEPAY");
    if (!config.SEPAY_WEBHOOK_KEY)
      return Response.json({ success: false }, { status: 503 });
    if (!verifySePaySignature(body, request.headers, config.SEPAY_WEBHOOK_KEY))
      return Response.json({ success: false }, { status: 401 });
    let input, hook;
    try {
      input = JSON.parse(body.toString("utf8"));
      hook = normalizeSePayWebhook(input);
    } catch {
      return Response.json({ success: false }, { status: 400 });
    }
    const result = await db.rpc("reloo_receive_sepay", {
      p_event: hook.id,
      p_hash: createHash("sha256").update(body).digest("hex"),
      p_payload: encryptPrivate(JSON.stringify(input)),
    });
    if (result.error)
      return Response.json(
        { success: false },
        {
          status: result.error.message.includes("WEBHOOK_CONTENT_CONFLICT")
            ? 409
            : 503,
        },
      );
    return Response.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ success: false }, { status: 503 });
  }
}
