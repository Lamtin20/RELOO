import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const { data: threads, error } = await db
      .from("chat_threads")
      .select("*")
      .or(`lender_id.eq.${profile.id},buyer_id.eq.${profile.id}`)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Storage unavailable");
    const ids = (threads || []).map((thread) => thread.id);
    const { data: messages, error: messagesError } = ids.length
      ? await db
          .from("chat_messages")
          .select("*")
          .in("thread_id", ids)
          .order("created_at", { ascending: true })
          .limit(2000)
      : { data: [] };
    if (messagesError) throw new Error("Storage unavailable");
    return Response.json(
      {
        ok: true,
        threads: (threads || []).map((thread) => ({
          id: thread.id,
          type: thread.thread_type,
          listingId: thread.listing_id,
          orderId: thread.transaction_id,
          lenderId: thread.lender_id,
          buyerId: thread.buyer_id,
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          messages: (messages || [])
            .filter((message) => message.thread_id === thread.id)
            .map((message) => ({
              ...message.message_data,
              id: message.id,
              type: message.message_type,
              text: message.body,
              senderId: message.sender_id,
              readBy: message.read_by || [],
              createdAt: message.created_at,
            })),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, {
      scope: "inquiry_write",
    });
    const { listingId } = await readJson(request);
    if (typeof listingId !== "string" || listingId.length > 100)
      throw new HttpError(400, "Tin đăng không hợp lệ.");
    const { data: listing, error } = await db
      .from("assets")
      .select("id,owner_id,status,is_locked")
      .eq("id", listingId)
      .maybeSingle();
    if (
      error ||
      !listing ||
      listing.owner_id === profile.id ||
      listing.is_locked ||
      !["available", "rented"].includes(listing.status)
    )
      throw new HttpError(403, "Không mở được trao đổi về tin đăng này.");
    const { error: ownerError } = await db.rpc("reloo_assert_active", {
      p_profile_id: listing.owner_id,
    });
    if (ownerError)
      throw new HttpError(403, "Chủ đồ chưa đủ điều kiện giao dịch.");
    const id = `inquiry_${listing.id}_${profile.id}`;
    const { error: writeError } = await db
      .from("chat_threads")
      .upsert(
        {
          id,
          listing_id: listing.id,
          lender_id: listing.owner_id,
          buyer_id: profile.id,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (writeError) throw new HttpError(503, "Chưa mở được cuộc trò chuyện.");
    return Response.json({
      ok: true,
      thread: {
        id,
        type: "inquiry",
        listingId: listing.id,
        lenderId: listing.owner_id,
        buyerId: profile.id,
        messages: [],
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
