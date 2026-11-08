import {
  localTestRequest,
  testDatabase,
  testDbFacade,
} from "@/lib/neighborhood/test-runtime";
import { verifySandboxWebhook } from "@/lib/neighborhood/providers";
import { UUID } from "@/lib/neighborhood/domain";
export async function POST(request) {
  if (!localTestRequest(request)) return new Response(null, { status: 404 });
  try {
    if (Number(request.headers.get("content-length")) > 5000)
      return new Response(null, { status: 413 });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 5000)
      return new Response(null, { status: 413 });
    const event = verifySandboxWebhook(
      raw,
      request.headers,
      process.env.RELOO_NEIGHBORHOOD_TEST_SECRET,
    );
    if (!UUID.test(event.orderId)) throw Error("INVALID_INPUT");
    const db = testDbFacade(await testDatabase());
    const r = await db.rpc("reloo_neighborhood_payment", {
      p_provider: "SANDBOX",
      p_event: event.eventId,
      p_order: event.orderId,
      p_status: event.status,
      p_amount: event.amount,
      p_sequence: event.sequence,
      p_fingerprint: event.fingerprint,
    });
    if (r.error) throw Error("PAYMENT_UNAVAILABLE");
    return Response.json({ ok: true, testMode: true, result: r.data });
  } catch {
    return Response.json(
      { ok: false, code: "WEBHOOK_REJECTED" },
      { status: 403 },
    );
  }
}
