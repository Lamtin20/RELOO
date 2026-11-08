"use client";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isNative, startNativeLogin } from "@/lib/mobile/client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReloo } from "@/lib/store";

export function SocialAuthButton({
  provider = "google",
  next = "/",
  intent = "both",
  disabled = false,
  onError,
  onBusyChange,
}) {
  const providerName=provider==="apple"?"Apple":"Google";
  const router = useRouter();
  const { actions } = useReloo();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const failure = (e) => {
      onError?.(e.detail);
      setBusy(false);
      onBusyChange?.(false);
    };
    window.addEventListener("reloo-native-auth-error", failure);
    return () => window.removeEventListener("reloo-native-auth-error", failure);
  }, [onError, onBusyChange]);
  async function signIn() {
    if (busy || disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    onError?.("");
    try {
      if (isNative()) {
        const result = await startNativeLogin(next, intent, provider);
        if (result?.next) {
          await actions.refreshSession();
          router.replace(result.next);
        }
        setBusy(false);
        onBusyChange?.(false);
        return;
      }
      const response = await fetch("/api/auth/"+provider, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next, intent }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error || "Chưa mở được đăng nhập "+providerName+".");
      window.location.assign(result.url);
    } catch (error) {
      onError?.(
        error.name === "TimeoutError"
          ? "Kết nối đang chậm. Vui lòng thử lại sau."
          : error.message,
      );
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <button
      type="button"
      className="google-auth-button"
      onClick={signIn}
      disabled={busy || disabled}
    >
      {busy ? (
        <LoaderCircle size={18} className="spin" />
      ) : (
        provider==="apple"?<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.1 12.3c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.4-1.6-3-1.7-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.1 2.6 2 1-.1 1.4-.7 2.7-.7s1.6.7 2.7.7 1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.1ZM15 6c.6-.8 1.1-1.9 1-3-.9 0-2.1.7-2.8 1.5-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z"/></svg>:<img src="/brand/google-g.png" alt="" width={20} height={20} />
      )}
      <span>{busy ? "Đang kết nối "+providerName+"..." : "Tiếp tục với "+providerName}</span>
    </button>
  );
}

export function GoogleAuthButton(props){return <SocialAuthButton {...props} provider="google"/>;}
