import { randomUUID } from "node:crypto";
import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, {
      scope: "chat_write",
    });
    const { threadId, message } = await readJson(request, 600000);
    if (
      typeof threadId !== "string" ||
      threadId.length > 250 ||
      !["text", "image", "audio", "video", "location"].includes(message?.type)
    )
      throw new HttpError(400, "Tin nhắn không hợp lệ.");
    const safe = { id: randomUUID(), type: message.type };
    if (message.type === "text") {
      if (
        typeof message.text !== "string" ||
        !message.text.trim() ||
        message.text.length > 6000
      )
        throw new HttpError(400, "Tin nhắn tối đa 6.000 ký tự.");
      safe.text = message.text.trim();
    } else if (message.type === "location") {
      const { lat, lng, address = "", label = "" } = message.location || {};
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180 ||
        typeof address !== "string" ||
        address.length > 500
      )
        throw new HttpError(400, "Vị trí không hợp lệ.");
      safe.location = { lat, lng, address, label: String(label).slice(0, 100) };
    } else {
      if (
        typeof message.mediaUrl !== "string" ||
        message.mediaUrl.length > 500000 ||
        !/^data:(image\/(png|jpeg|webp|gif)|audio\/(webm|ogg|mp4)|video\/(webm|mp4))(;codecs=[^;,]+)?;base64,[A-Za-z0-9+/=]+$/.test(
          message.mediaUrl,
        )
      )
        throw new HttpError(400, "Tệp chưa được hỗ trợ hoặc vượt quá 350 KB.");
      safe.mediaUrl = message.mediaUrl;
    }
    const { data, error } = await db.rpc("reloo_send_message", {
      p_profile_id: profile.id,
      p_thread_id: threadId,
      p_message: safe,
    });
    if (error)
      throw new HttpError(
        403,
        "Bạn chưa có quyền gửi tin nhắn trong cuộc trò chuyện này.",
        "MESSAGE_DENIED",
      );
    return Response.json({ ok: true, message: data });
  } catch (error) {
    return errorResponse(error);
  }
}
