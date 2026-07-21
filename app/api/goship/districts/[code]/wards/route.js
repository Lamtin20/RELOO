import { NextResponse } from "next/server";
import { fetchGoshipWardsByDistrict } from "@/lib/goship/client";
import { isGoshipConfigured } from "@/lib/goship/env";

export async function GET(_request, { params }) {
  const { code } = await params;

  if (!isGoshipConfigured()) {
    return NextResponse.json({ ok: false, error: "Goship chưa được cấu hình" }, { status: 503 });
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "Thiếu mã quận/huyện" }, { status: 400 });
  }

  try {
    const data = await fetchGoshipWardsByDistrict(code);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Không lấy được phường/xã" },
      { status: err.status || 502 },
    );
  }
}
