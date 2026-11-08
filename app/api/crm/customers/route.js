import { requirePermission } from "@/lib/operations/permissions";
import { encryptPrivate, decryptPrivate } from "@/lib/operations/crypto";
import {
  assertOrigin,
  readJson,
  errorResponse,
  HttpError,
} from "@/lib/server/http";
import { normalizePhone } from "@/lib/phone";
export async function GET(request) {
  try {
    const { profile, db, staff } = await requirePermission(
        request,
        "customers.read",
      ),
      id = new URL(request.url).searchParams.get("id");
    if (!id || id.length > 100) throw new HttpError(400, "Chọn khách hàng.");
    const customer = await db
      .from("profiles")
      .select(
        "id,name,email,phone,avatar_url,profile_data,activation_status,kyc_level,created_at,role",
      )
      .eq("id", id)
      .single();
    if (customer.error) throw new HttpError(404, "Không tìm thấy khách hàng.");
    const canIdentity =
        staff.permissions.includes("*") ||
        staff.permissions.includes("kyc.read"),
      admin = profile.role === "admin" || ['owner','admin'].includes(staff.role);
    const [banks, blacklist, changes, identity, submissions] =
      await Promise.all([
        db
          .from("profile_bank_accounts")
          .select(
            "id,bank_name,bank_code,masked_account,name_status,is_default,account_encrypted,holder_encrypted",
          )
          .eq("profile_id", id),
        db
          .from("risk_blacklist")
          .select("id,status,kind,reason,created_at")
          .eq("profile_id", id)
          .order("created_at", { ascending: false }),
        db
          .from("customer_changes")
          .select(
            "id,actor_id,reason,fields,created_at,profiles!customer_changes_actor_id_fkey(name)",
          )
          .eq("profile_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
        canIdentity
          ? db
              .from("verified_identities")
              .select("fields_encrypted,expires_at")
              .eq("profile_id", id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        canIdentity
          ? db
              .from("kyc_submissions")
              .select(
                "id,status,declared_expiry,review_due_at,created_at,expires_at",
              )
              .eq("profile_id", id)
              .order("created_at", { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [] }),
      ]);
    if ([banks, blacklist, changes, identity, submissions].some((r) => r.error))
      throw new Error("CUSTOMER_DETAILS_UNAVAILABLE");
    await db.from("security_audit").insert({
      actor_id: profile.id,
      subject_id: id,
      action: "CUSTOMER_DETAILS_VIEWED",
      details: { identityAccess: canIdentity },
    });
    return Response.json(
      {
        ok: true,
        customer: customer.data,
        banks: banks.data.map(
          ({ account_encrypted, holder_encrypted, ...row }) => ({
            ...row,
            accountNumber: admin ? decryptPrivate(account_encrypted) : null,
            holderName: admin ? decryptPrivate(holder_encrypted) : null,
          }),
        ),
        blacklist: blacklist.data,
        changes: changes.data,
        identity: identity.data
          ? {
              ...JSON.parse(decryptPrivate(identity.data.fields_encrypted)),
              expiresAt: identity.data.expires_at,
            }
          : null,
        submissions: submissions.data,
        permissions: {
          edit:
            admin &&
            (staff.permissions.includes("*") ||
              staff.permissions.includes("customers.write")),
          groups:
            admin &&
            (staff.permissions.includes("*") ||
              staff.permissions.includes("risk.write")),
          identity: canIdentity,
        },
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const input = await readJson(request),
      permission = input.action === "GROUP" ? "risk.write" : "customers.write",
      { profile, db,staff } = await requirePermission(request, permission);
    if (profile.role !== "admin" && !['owner','admin'].includes(staff.role))
      throw new HttpError(
        403,
        "Chỉ admin được chỉnh thông tin hoặc nhóm khách hàng.",
      );
    if (typeof input.reason !== "string" || input.reason.trim().length < 20)
      throw new HttpError(400, "Ghi lý do thao tác tối thiểu 20 ký tự.");
    if (input.action === "GROUP") {
      const r = await db.rpc("reloo_customer_group", {
        p_actor: profile.id,
        p_profile: input.id,
        p_group: input.group,
        p_reason: input.reason.trim(),
      });
      if (r.error)
        throw new HttpError(409, "Chưa chuyển được nhóm khách hàng.");
    } else if (input.action === "EDIT") {
      const allowed = {
          name: 100,
          phone: 15,
          bio: 1500,
          address: 500,
          dateOfBirth: 10,
          gender: 30,
        },
        updates = {};
      for (const [key, value] of Object.entries(input.updates || {})) {
        if (
          !allowed[key] ||
          typeof value !== "string" ||
          value.length > allowed[key]
        )
          throw new HttpError(400, "Trường chỉnh sửa không hợp lệ.");
        updates[key] = value.trim();
      }
      if (updates.phone) {
        const phone = normalizePhone(updates.phone);
        if (!phone) throw new HttpError(400, "Số điện thoại không hợp lệ.");
        updates.phone = phone;
      }
      const before = await db
        .from("profiles")
        .select("name,phone,profile_data")
        .eq("id", input.id)
        .single();
      if (before.error) throw new HttpError(404, "Khách hàng không tồn tại.");
      const changed = Object.fromEntries(
        Object.entries(updates).filter(
          ([key, value]) =>
            value !==
            (["name", "phone"].includes(key)
              ? before.data[key]
              : before.data.profile_data?.[key] || ""),
        ),
      );
      if (!Object.keys(changed).length)
        throw new HttpError(400, "Chưa có thay đổi.");
      const changes = Object.fromEntries(
        Object.entries(changed).map(([key, value]) => [
          key,
          {
            before: ["name", "phone"].includes(key)
              ? before.data[key]
              : before.data.profile_data?.[key] || "",
            after: value,
          },
        ]),
      );
      const r = await db.rpc("reloo_edit_customer", {
        p_actor: profile.id,
        p_profile: input.id,
        p_updates: changed,
        p_reason: input.reason.trim(),
        p_changes: encryptPrivate(JSON.stringify(changes)),
        p_expected: before.data,
      });
      if (r.error)
        throw new HttpError(409, "Chưa lưu được chỉnh sửa khách hàng.");
    } else throw new HttpError(400, "Thao tác không hợp lệ.");
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
