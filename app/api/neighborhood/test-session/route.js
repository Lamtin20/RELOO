import {
  localTestRequest,
  testCookie,
  TEST_ACTORS,
} from "@/lib/neighborhood/test-runtime";
import { assertOrigin, readJson } from "@/lib/server/http";
export async function POST(request) {
  if (!localTestRequest(request)) return new Response(null, { status: 404 });
  try {
    assertOrigin(request);
    const input = await readJson(request, 1000);
    if (!TEST_ACTORS.includes(input.actor))
      return Response.json({ ok: false }, { status: 400 });
    return Response.json(
      { ok: true, testMode: true },
      {
        headers: {
          "Set-Cookie":
            "reloo-nk-test=" +
            testCookie(input.actor) +
            "; Path=/api/; HttpOnly; SameSite=Strict",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json({ ok: false }, { status: 403 });
  }
}
