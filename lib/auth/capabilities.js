import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "../supabase/env.js";
import { HttpError } from "../server/http.js";
import { supabaseServerFetch } from '../supabase/fetch.js';

let cached;
export async function authCapabilities() {
  if (!isSupabaseConfigured())
    return {
      available: false,
      google: false,
      apple: false,
      signup: false,
      phoneSignup: false,
      code: "AUTH_NOT_CONFIGURED",
    };
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (cached?.url === url && cached.key === key && cached.until > Date.now())
    return cached.value;
  let value;
  try {
    const response = await supabaseServerFetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Auth rejected configuration");
    const settings = await response.json();
    value = {
      available: true,
      google: settings.external?.google === true,
      apple: settings.external?.apple === true,
      emailLogin: settings.external?.email === true,
      phoneSignup: settings.disable_signup !== true && settings.external?.phone === true,
      signup: settings.disable_signup !== true && settings.external?.email === true,
      code: null,
    };
  } catch {
    value = {
      available: false,
      google: false,
      apple: false,
      signup: false,
      phoneSignup: false,
      code: "AUTH_SERVICE_UNAVAILABLE",
    };
  }
  cached = {
    url,
    key,
    value,
    until: Date.now() + (value.available ? 30000 : 5000),
  };
  return value;
}

export async function assertAuthReady({ google = false, apple = false, signup = false } = {}) {
  const capability = await authCapabilities();
  if (!capability.available)
    throw new HttpError(
      503,
      "Dịch vụ tài khoản đang chưa kết nối được. Vui lòng thử lại sau.",
      capability.code,
    );
  if (signup && !capability.signup)
    throw new HttpError(
      503,
      "Đăng ký bằng email chưa sẵn sàng. Vui lòng tiếp tục với Google.",
      "SIGNUP_DISABLED",
    );
  if (google && !capability.google)
    throw new HttpError(
      503,
      "Đăng nhập Google chưa được kích hoạt. Bạn có thể dùng email hoặc thử lại sau.",
      "GOOGLE_NOT_ENABLED",
    );
  if(apple&&!capability.apple)throw new HttpError(503,'Đăng nhập Apple chưa được kích hoạt. Bạn có thể tiếp tục với Google hoặc mật khẩu.','APPLE_NOT_ENABLED');
  return capability;
}
