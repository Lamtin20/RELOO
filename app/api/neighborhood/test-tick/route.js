import {
  localTestRequest,
  testDatabase,
  testDbFacade,
} from "@/lib/neighborhood/test-runtime";
import { assertOrigin } from "@/lib/server/http";
import { EVENTS, text } from "@/lib/neighborhood/content";
export async function POST(request) {
  if (!localTestRequest(request)) return new Response(null, { status: 404 });
  try {
    assertOrigin(request);
    const db = await testDatabase(),
      facade = testDbFacade(db);
    await facade.rpc("reloo_neighborhood_maintenance");
    const due = await db.query(
      "select id,event,aggregate_id from nk_outbox where status='QUEUED' and available_at<=now() order by created_at limit 50",
    );
    for (const e of due.rows) {
      const meta = EVENTS[e.event];
      if (!meta) continue;
      await facade.rpc("reloo_neighborhood_deliver", {
        p_id: e.id,
        p_title: text("vi-VN", meta.title),
        p_body: text("vi-VN", meta.body),
        p_link: meta.deepLink.replace(
          "{aggregateId}",
          encodeURIComponent(e.aggregate_id),
        ),
        p_now: new Date().toISOString(),
      });
    }
    return Response.json({
      ok: true,
      testMode: true,
      processed: due.rows.length,
    });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
