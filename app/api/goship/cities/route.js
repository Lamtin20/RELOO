import { NextResponse } from "next/server";
import { fetchGoshipCities } from "@/lib/goship/client";
import { isGoshipConfigured } from "@/lib/goship/env";

export async function GET() {
  if (!isGoshipConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Goship chưa được cấu hình (GOSHIP_ACCESS_TOKEN)" },
      { status: 503 },
    );
  }

  try {
    const data = await fetchGoshipCities();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Không lấy được danh sách tỉnh/thành" },
      { status: err.status || 502 },
    );
  }
}
