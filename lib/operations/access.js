import { CRM_MODULES } from "./modules.js";
import {ssoAuthorizePath} from '../auth/management-sso-policy.js';
import {federationAuthorizePath} from '../auth/federation-policy.js';
import {text} from '../neighborhood/content.js';

export const FULL_CRM_ROLES = ["owner", "admin"];
export const CRM_EXTRA_PERMISSION_LABELS={'bots.publish':'Xuất bản / quay lại cấu hình bot','support.assign':'Phân công hội thoại','support.contacts':'Xem liên hệ đã đồng ý'};
export const CRM_ROLE_LABELS = { owner: "Quản trị", admin: "Admin", staff: "Nhân viên" };
export const CRM_PERMISSION_GROUPS = {
  control: "Trung tâm vận hành",
  crm: "Truy cập CRM", reports: "Báo cáo tổng quan", traffic: "API & hành trình",
  customers: "Khách hàng", orders: "Đơn hàng", risk: "Rủi ro & xét duyệt",
  kyc: "Căn cước & ảnh định danh", jobs: "Hàng đợi", settings: "Cấu hình hệ thống",
  legal: "Hồ sơ pháp lý", roles: "Phân quyền nhân viên",neighborhood:text('vi-VN','brand'),
  ...Object.fromEntries(Object.entries(CRM_MODULES).map(([key, value]) => [key, value.label])),
};
export const CRM_PERMISSIONS = Object.keys(CRM_PERMISSION_GROUPS).flatMap(group =>
  ["crm", "reports", "traffic", "orders", "control"].includes(group) ? [group + ".read"] : [group + ".read", group + ".write"]).concat(['neighborhood.verify','neighborhood.evidence','bots.publish','support.assign','support.contacts']);
export function isFullCrmRole(role) { return FULL_CRM_ROLES.includes(role); }
export function effectiveCrmPermissions(staff) {
  if (!staff?.enabled) return [];
  if (isFullCrmRole(staff.role)) return ["*"];
  if (staff.role !== "staff") return [];
  const permissions = new Set((staff.permissions || []).filter(p => CRM_PERMISSIONS.includes(p) && p !== "roles.write"));
  for (const p of permissions) if (p.endsWith(".write")) permissions.add(p.replace(/\.write$/, ".read"));
  if(permissions.has('bots.publish'))permissions.add('bots.read');
  if(permissions.has('support.assign')||permissions.has('support.contacts'))permissions.add('support.read');
  return [...permissions];
}
export function crmAllowed(staff, permission) {
  const permissions = effectiveCrmPermissions(staff);
  return permissions.includes("*") || permissions.includes(permission);
}
export const CRM_VIEW_PERMISSIONS = {
  analytics:'traffic.read',
  control:'control.read',
  neighborhood:'neighborhood.read',
  overview: "reports.read", customers: "customers.read", blacklist: "risk.read", cases: "risk.read",
  integrity: "risk.read", kyc: "kyc.read", jobs: "jobs.read", traffic: "traffic.read",
  staff: "roles.read", conversations: "support.read", finance: "accounting.read",
  virtualAccounts: "accounting.read", settings: "settings.read", branding: "settings.read",
  news: "content.read", banners: "content.read", shorts: "content.read",
  legal: "legal.read", ...Object.fromEntries(Object.keys(CRM_MODULES).map(k => [k, k + ".read"])),
};
export function crmViews(staff) { return Object.keys(CRM_VIEW_PERMISSIONS).filter(v => crmAllowed(staff, CRM_VIEW_PERMISSIONS[v])); }
export function validateStaffGrant(input) {
  if (!Object.hasOwn(CRM_ROLE_LABELS,input.role) || typeof input.enabled !== "boolean" ||
      !Array.isArray(input.permissions) || input.permissions.length > CRM_PERMISSIONS.length ||
      input.permissions.some(p => typeof p !== "string" || (p !== "*" && !CRM_PERMISSIONS.includes(p))))
    throw Error("Vai trò hoặc quyền truy cập chưa hợp lệ.");
  if (!isFullCrmRole(input.role) && (input.permissions.includes("*") || input.permissions.includes("roles.write")))
    throw Error("Chỉ quản trị và admin được cấp toàn quyền hoặc phân quyền.");
  return isFullCrmRole(input.role) ? ["*"] : [...new Set(["crm.read", ...input.permissions])];
}
export function crmNext(value) {
  const federation=federationAuthorizePath(value);if(federation)return federation;
  const sso=ssoAuthorizePath(value);if(sso)return sso;
  if(value==='/chat-control'||value==='/agent-office')return value;
  try { const u=new URL(value || "/crm","https://crm.reloo.vn");
    if (u.origin!=="https://crm.reloo.vn" || u.pathname!=="/crm" || /[\\\u0000-\u001f]/.test(value || "")) return "/crm";
    const view=u.searchParams.get("view");return view && Object.hasOwn(CRM_VIEW_PERMISSIONS,view) ? "/crm?view="+encodeURIComponent(view) : "/crm";
  } catch { return "/crm"; }
}
