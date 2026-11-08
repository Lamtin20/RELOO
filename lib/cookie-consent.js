"use client";
import { useSyncExternalStore } from "react";
import {disableGoogleAnalytics} from './analytics/google-browser';
import {validConsent,CONSENT_VERSION,CONSENT_MAX_AGE} from './privacy/consent-policy.mjs';
export {validConsent,CONSENT_VERSION,CONSENT_MAX_AGE};
const KEY = "reloo-cookie-consent",
  EVENT = "reloo-consent-changed";
function snapshot() {
  try {
    const raw =
      localStorage.getItem(KEY) ||
      decodeURIComponent(
        document.cookie
          .split("; ")
          .find((value) => value.startsWith(`${KEY}=`))
          ?.slice(KEY.length + 1) || "null",
      );
    return validConsent(JSON.parse(raw)) ? raw : "null";
  } catch {
    return "null";
  }
}
function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
export function useCookieConsent() {
  return JSON.parse(useSyncExternalStore(subscribe, snapshot, () => "null"));
}
export function saveCookieConsent({ analytics = false, marketing = false }) {
  if(!analytics)disableGoogleAnalytics();
  const raw = JSON.stringify({
    version: CONSENT_VERSION,
    analytics: analytics === true,
    marketing: marketing === true,
    savedAt: Date.now(),
  });
  document.cookie = `${KEY}=${encodeURIComponent(raw)}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  let stored = document.cookie
    .split(";")
    .some((entry) => entry.trim() === `${KEY}=${encodeURIComponent(raw)}`);
  try {
    localStorage.setItem(KEY, raw);
    stored = true;
  } catch {
    /* The first-party cookie can persist consent without localStorage. */
  }
  if (!stored)
    throw new Error(
      "Trình duyệt chưa lưu được lựa chọn cookie. Hãy kiểm tra quyền lưu trữ của trang.",
    );
  if (!analytics || !marketing)
    for (const entry of document.cookie.split(";")) {
      const name = entry.trim().split("=")[0];
      const analyticsCookie = /^(_ga(?:_|$)|_gid$|reloo_analytics)/.test(name);
      const marketingCookie =
        /^(_fbp$|_fbc$|_ttp$|_tt_enable_cookie$|reloo_marketing)/.test(name);
      if ((!analytics && analyticsCookie) || (!marketing && marketingCookie)) {
        for (const domain of ["", location.hostname, `.${location.hostname}`])
          document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
      }
    }
  try {
    if (!analytics) { localStorage.removeItem('reloo_analytics_scope');sessionStorage.removeItem('reloo_product_analytics_context');sessionStorage.removeItem('reloo_product_discovery'); localStorage.removeItem('reloo_analytics_visitor'); sessionStorage.removeItem('reloo_analytics_session');sessionStorage.removeItem('reloo_analytics_session_v2');localStorage.removeItem('reloo_news_visitor');sessionStorage.removeItem('reloo_news_session'); }
    if (!marketing) localStorage.removeItem('reloo_marketing_interests');
  } catch { /* Consent is still saved in the necessary cookie. */ }
  window.dispatchEvent(new Event(EVENT));
}
export function openCookieSettings() {
  window.dispatchEvent(new Event("reloo-cookie-settings"));
}
