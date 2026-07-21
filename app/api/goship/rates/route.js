import { NextResponse } from "next/server";
import { fetchGoshipRates } from "@/lib/goship/client";
import { isGoshipConfigured } from "@/lib/goship/env";

export async function POST(request) {
  if (!isGoshipConfigured()) {
    return NextResponse.json({ ok: false, error: "Goship chưa được cấu hình" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { addressFrom, addressTo, parcel } = body ?? {};

    if (!addressFrom?.city || !addressFrom?.district || !addressFrom?.ward) {
      return NextResponse.json(
        { ok: false, error: "Thiếu địa chỉ lấy hàng (tỉnh/quận/phường)" },
        { status: 400 },
      );
    }

    if (!addressTo?.city || !addressTo?.district || !addressTo?.ward) {
      return NextResponse.json(
        { ok: false, error: "Thiếu địa chỉ giao hàng (tỉnh/quận/phường)" },
        { status: 400 },
      );
    }

    const data = await fetchGoshipRates({ addressFrom, addressTo, parcel });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Không tra được cước phí" },
      { status: err.status || 502 },
    );
  }
}
