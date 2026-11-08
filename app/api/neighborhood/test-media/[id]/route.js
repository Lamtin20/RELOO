import {
  localTestRequest,
  testDatabase,
} from "@/lib/neighborhood/test-runtime";
import { mediaBytes } from "@/lib/content/media";
import { UUID } from "@/lib/neighborhood/domain";
export async function GET(request, { params }) {
  if (!localTestRequest(request)) return new Response(null, { status: 404 });
  try {
    const { id } = await params;
    if (!UUID.test(id)) return new Response(null, { status: 404 });
    const db = await testDatabase(),
      r = await db.query("select filename from media_assets where id=$1", [id]);
    if (!r.rows[0]) return new Response(null, { status: 404 });
    return new Response(await mediaBytes(r.rows[0]), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private,no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
