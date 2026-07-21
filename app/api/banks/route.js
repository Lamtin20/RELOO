import { NextResponse } from "next/server";
import { fetchVietQrBanks } from "@/lib/bank/vietqr-server";
import { sortBanks } from "@/lib/bank/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await fetchVietQrBanks();
    const banks = sortBanks(raw).map((b) => ({
      name: b.name,
      shortName: b.shortName,
      code: b.code,
      bin: b.bin,
      logo: b.logo,
    }));

    return NextResponse.json(
      { ok: true, banks },
      {
        headers: {
          "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "Không tải được danh sách ngân hàng. Vui lòng thử lại sau." },
      { status: 502 }
    );
  }
}
