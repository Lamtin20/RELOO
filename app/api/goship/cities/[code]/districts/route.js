import { NextResponse } from "next/server";
import { fetchGoshipDistrictsByCity } from "@/lib/goship/client";
import { isGoshipConfigured } from "@/lib/goship/env";

export async function GET(_request, { params }) {
  const { code } = await params;

  if (!isGoshipConfigured()) {
    return NextResponse.json({ ok: false, error: "Goship chưa được cấu hình" }, { status: 503 });
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "Thiếu mã tỉnh/thành" }, { status: 400 });
  }

  try {
    const data = await fetchGoshipDistrictsByCity(code);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Không lấy được quận/huyện" },
      { status: err.status || 502 },
    );
  }
}
