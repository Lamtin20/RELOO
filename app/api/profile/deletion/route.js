import { requireAccount } from "@/lib/security/authorization";
import {requireSmartKey} from '@/lib/security/smart-key';
import {
  assertOrigin,
  errorResponse,
  HttpError,
  rateLimit,
} from "@/lib/server/http";
export async function GET(request) {
  try {
    const { profile, db } = await requireAccount(request, { active: false });
    const r = await db.rpc("reloo_deletion_eligibility", {
      p_profile: profile.id,
    });
    if (r.error) throw Error("DELETION_CHECK_UNAVAILABLE");
    return Response.json(
      { ok: true, ...r.data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "account-deletion", 3);
    const account=await requireAccount(request,{active:false}),{profile,db}=account;
    const smartReceipt=await requireSmartKey(request,account);
    const r = await db.rpc("reloo_confirm_account_deletion", {
      p_actor:profile.id,p_receipt:smartReceipt.id,
    });
    if (r.error)
      throw new HttpError(
        409,
        "Tài khoản còn giao dịch, hợp đồng, số dư hoặc quyền quản trị chưa hoàn tất. Hãy xử lý trước khi xóa.",
        "UNRESOLVED_OBLIGATIONS",
      );
    return Response.json({
      ok: true,
      id: r.data,
      message:
        "Tài khoản đã ngừng hoạt động. Hồ sơ cá nhân được xóa; tác vụ xóa ảnh và tài khoản đăng nhập đang xử lý.",
    });
  } catch (e) {
    return errorResponse(e);
  }
}
