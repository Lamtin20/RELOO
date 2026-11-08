import { requireCrmAccess } from "./crm-auth.js";
import { crmAllowed } from "./access.js";
import { HttpError } from "../server/http.js";

export async function requirePermission(request, permission) {
  const account = await requireCrmAccess(request);
  if (!crmAllowed(account.staff,permission)) {
    throw new HttpError(403, "Bạn chưa có quyền thực hiện thao tác này.", "PERMISSION_REQUIRED");
  }
  return account;
}
