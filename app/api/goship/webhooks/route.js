import { NextResponse } from "next/server";
import { verifyGoshipWebhook } from "@/lib/goship/webhook-verify";
import { appendGoshipTrackingEvent } from "@/lib/goship/shipping-tracking-store";

/**
 * POST /api/goship/webhooks
 * Nhận cập nhật trạng thái vận đơn từ Goship
 */
export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const secret = process.env.GOSHIP_CLIENT_SECRET;
  const hmac = request.headers.get("x-goship-hmac-sha256");

  if (secret && hmac) {
    const verified = verifyGoshipWebhook(data, hmac, secret);
    if (!verified) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = appendGoshipTrackingEvent(data);
  if (!event) {
    return NextResponse.json({ ok: false, error: "Missing order_id" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: event });
}
