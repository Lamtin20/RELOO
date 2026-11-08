import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server.js";
import { getSupabaseAnonKey, getSupabaseUrl } from "../supabase/env.js";
import { securityDb } from "../security/service.js";
import { HttpError } from "../server/http.js";
import { normalizePhone } from "../phone.js";
import { supabaseServerFetch } from '../supabase/fetch.js';
import {federationCookie,federatedIdentity} from './federation-identity.js';
import {federationClient} from './federation-policy.js';

export async function authenticatedIdentity(request) {
  if(process.env.RELOO_IDENTITY_MODE==='federated-client'){
    if(!federationClient('https://'+(request.headers.get('host')||new URL(request.url).host).toLowerCase())||!federationCookie(request))throw new HttpError(401,'Tiếp tục đăng nhập tại CRM trung tâm.','AUTH_REQUIRED');
    return {authUser:await federatedIdentity(request),client:await createSupabaseServerClient()};
  }
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (token && token.length > 12000)
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ.", "AUTH_REQUIRED");
  const client = token
    ? createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: supabaseServerFetch,
        },
      })
    : await createSupabaseServerClient();
  if (!client)
    throw new HttpError(
      503,
      "Dịch vụ tài khoản chưa sẵn sàng.",
      "AUTH_NOT_CONFIGURED",
    );
  const { data, error } = await client.auth.getUser(token);
  if (error?.name === "AuthRetryableFetchError" || error?.status >= 500)
    throw new HttpError(
      503,
      "Chưa xác minh được phiên đăng nhập. Vui lòng thử lại sau.",
      "AUTH_SERVICE_UNAVAILABLE",
    );
  if (error || !data.user)
    throw new HttpError(
      401,
      "Vui lòng đăng nhập tài khoản RELOO.",
      "AUTH_REQUIRED",
    );
  return { authUser: data.user, client };
}

export async function findAccountProfile(authUser, db = securityDb()) {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (error)
    throw new HttpError(
      503,
      "Dịch vụ hồ sơ đang chưa sẵn sàng. Vui lòng thử lại sau.",
      "PROFILE_STORAGE_UNAVAILABLE",
    );
  if (data?.deleted_at) throw new HttpError(410,"Tài khoản đã được yêu cầu xóa.","ACCOUNT_DELETED");
  return data;
}

export function needsProfileCompletion(profile) {
  return !profile || !normalizePhone(profile.phone);
}

export function incompleteSession(authUser) {
  const name =
    authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  return {
    id: authUser.id,
    name: typeof name === "string" ? name.slice(0, 100) : "Bạn mới",
    email: authUser.email || "",
    phone: normalizePhone(authUser.phone)||"",
    role: "both",
    avatar: "/brand/reloo-logo.png",
    activationStatus: "PENDING",
    screeningStatus: "UNKNOWN",
    screeningValidUntil: null,
    serverAuthenticated: true,
    profileComplete: false,
    kycLevel: "L0",
    trustScore: 0,
  };
}
