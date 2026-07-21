import { NextResponse } from "next/server";
import {
  fetchGoshipCities,
  fetchGoshipDistrictsByCity,
  fetchGoshipWardsByDistrict,
} from "@/lib/goship/client";
import {
  findGoshipCity,
  findGoshipDistrict,
  findGoshipWard,
} from "@/lib/goship/resolve-address";

/**
 * POST /api/goship/resolve
 * Ghép tỉnh/phường (tin đăng hoặc hồ sơ) → mã Goship
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const provinceName = body.provinceName ?? body.province?.name ?? "";
    const wardName = body.wardName ?? body.ward?.name ?? "";
    const street = body.street ?? body.addressDetail ?? "";

    const cities = await fetchGoshipCities();
    const city = findGoshipCity(cities, provinceName);
    if (!city) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy tỉnh/thành trên Goship" },
        { status: 404 },
      );
    }

    const districts = await fetchGoshipDistrictsByCity(city.id);
    const district = findGoshipDistrict(districts, wardName || provinceName, provinceName);
    if (!district) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy quận/huyện trên Goship" },
        { status: 404 },
      );
    }

    const wards = await fetchGoshipWardsByDistrict(district.id);
    const ward = findGoshipWard(wards, wardName);
    if (!ward) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy phường/xã trên Goship" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        street: street?.trim() ?? "",
        city,
        district,
        ward,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Lỗi resolve địa chỉ Goship" },
      { status: err.status ?? 500 },
    );
  }
}
