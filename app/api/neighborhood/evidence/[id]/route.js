import {
  neighborhoodAccount,
  neighborhoodError,
} from "@/lib/neighborhood/server";
import { evidenceBytes } from "@/lib/neighborhood/evidence";
import { UUID } from "@/lib/neighborhood/domain";
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) throw Error("NOT_FOUND");
    const { db, profile } = await neighborhoodAccount(request);
    const r = await db.rpc("reloo_neighborhood_evidence", {
      p_actor: profile.id,
      p_id: id,
      p_order: null,
      p_filename: null,
      p_action: "READ",
    });
    if (r.error) throw Error(r.error.message);
    return new Response(await evidenceBytes(r.data.filename), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private,no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return neighborhoodError(e, request);
  }
}
