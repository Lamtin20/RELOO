export async function GET() {
  return Response.json({ service: "reloo", status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
