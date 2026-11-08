import { createHash } from "node:crypto";
import { securityDb } from "@/lib/security/service";
import {
  errorResponse,
  HttpError,
  readJson,
  secretMatches,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    const secret = process.env.GHTK_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(503, "Webhook chưa được cấu hình.");
    if (!secretMatches(new URL(request.url).searchParams.get("hash"), secret))
      throw new HttpError(401, "Webhook không được xác thực.");
    let body;
    if (
      request.headers
        .get("content-type")
        ?.includes("application/x-www-form-urlencoded")
    ) {
      if (Number(request.headers.get("content-length")) > 16000)
        throw new HttpError(413, "Payload quá lớn.");
      const text = await request.text();
      if (Buffer.byteLength(text) > 16000)
        throw new HttpError(413, "Payload quá lớn.");
      body = Object.fromEntries(new URLSearchParams(text));
    } else body = await readJson(request, 16000);
    if (
      typeof body.label_id !== "string" ||
      body.label_id.length > 100 ||
      typeof body.partner_id !== "string" ||
      body.partner_id.length > 100 ||
      ![
        -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 21, 123, 127, 128,
        45, 49, 410,
      ].includes(Number(body.status_id)) ||
      !Number.isFinite(Date.parse(body.action_time))
    )
      throw new HttpError(400, "Payload webhook không hợp lệ.");
    const id = createHash("sha256")
      .update(
        `${body.label_id}|${body.status_id}|${new Date(body.action_time).toISOString()}`,
      )
      .digest("hex");
    const { data, error } = await securityDb().rpc("reloo_ghtk_event", {
      p_event_id: id,
      p_payload: body,
    });
    if (error)
      throw new HttpError(
        503,
        "Vận đơn chưa được đăng ký hoặc chưa lưu được sự kiện.",
      );
    return Response.json({ ok: true, duplicate: !data });
  } catch (error) {
    return errorResponse(error);
  }
}
