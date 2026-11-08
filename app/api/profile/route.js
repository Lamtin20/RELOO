import {requirePreciseLocation} from '@/lib/maps/location-requirement';
import {profileContact} from '@/lib/auth/profile-contact';
import { requireAccount, publicSession } from "@/lib/security/authorization";
import { queueIdentifier } from "@/lib/security/identifiers";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { addressText, validateAddress } from "@/lib/profile/validation";
import { addressCatalog } from "@/lib/profile/address-server";
export async function GET(request) {
  try {
    const { profile, db, authUser } = await requireAccount(request, { active: false });
    const { data, error } = await db
      .from("risk_identifiers")
      .select("id,kind,bank_code,masked_value,status,checked_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Storage unavailable");
    return Response.json(
      {
        ok: true,
        profile: publicSession(profile),
        details: profile.profile_data || {},
        contact: profileContact(authUser,profile),
        identifiers: data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "profile-write", 10);
    const { profile, db } = await requireAccount(request, { active: false });
    if (profile.activation_status === "RESTRICTED")
      throw new HttpError(
        403,
        "Tài khoản đang bị hạn chế chỉnh sửa.",
        "ACCOUNT_RESTRICTED",
      );
    const input = await readJson(request),
      updates = {};
    if (
      Object.keys(input).some(
        (key) => !["name", "bio", "address", "addressDetails"].includes(key),
      )
    )
      throw new HttpError(
        400,
        "Email và số điện thoại đăng ký không thể thay đổi tại đây.",
        "IMMUTABLE_FIELD",
      );
    for (const [key, max] of [
      ["name", 100],
      ["bio", 1500],
      ["address", 500],
    ]) {
      if (input[key] !== undefined) {
        if (typeof input[key] !== "string" || input[key].length > max)
          throw new HttpError(400, "Thông tin hồ sơ không hợp lệ.");
        updates[key] = input[key].trim();
      }
    }
    if (input.addressDetails !== undefined) {
      try {
        updates.addressDetails = await validateAddress(
          input.addressDetails,
          addressCatalog,
        );
        if(updates.addressDetails.preciseLocation)updates.addressDetails.preciseLocation=await requirePreciseLocation(updates.addressDetails.preciseLocation,profile.id,{fresh:false});
        updates.address = addressText(updates.addressDetails);
      } catch (cause) {
        if (/UNAVAILABLE|CATALOG_INVALID/.test(cause.message))
          throw new HttpError(503, "Danh mục địa chỉ đang chưa sẵn sàng.");
        throw new HttpError(
          400,
          "Hãy chọn tỉnh/thành, phường/xã và nhập địa chỉ cụ thể.",
        );
      }
    }
    if (!Object.keys(updates).length)
      throw new HttpError(400, "Chưa có thông tin cần cập nhật.");
    const { error } = await db.rpc("reloo_profile_update", {
      p_profile: profile.id,
      p_updates: updates,
    });
    if (error)
      throw new HttpError(
        403,
        "Chưa cập nhật được hồ sơ; kiểm tra trạng thái tài khoản.",
      );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "identifier-add", 10);
    const { profile, db } = await requireAccount(request, { active: false });
    if (profile.activation_status === "RESTRICTED")
      throw new HttpError(
        403,
        "Tài khoản đang bị hạn chế chỉnh sửa.",
        "ACCOUNT_RESTRICTED",
      );
    const input = await readJson(request);
    if (input.consent !== true)
      throw new HttpError(400, "Cần đồng ý kiểm tra thông tin.");
    const result = await queueIdentifier(
      db,
      profile.id,
      input.kind,
      input.value,
      input.bankCode || "",
    );
    return Response.json({ ok: true, identifier: result });
  } catch (error) {
    return errorResponse(error);
  }
}
