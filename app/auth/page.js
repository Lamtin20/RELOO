"use client";
import {AppleAuthButton} from '@/components/auth/AppleAuthButton';
import {useLocale} from '@/components/settings/LocaleProvider';
import {phoneAccountCopy} from '@/lib/i18n/phone-account';

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { authLink, safeNextPath, loginLanding, oauthMessage } from "@/lib/auth-navigation";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useReloo } from "@/lib/store";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <p role="status">Đang tải đăng nhập...</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
 const {locale}=useLocale(),t=phoneAccountCopy[locale]||phoneAccountCopy['vi-VN'];
  const router = useRouter();
  const params = useSearchParams();
  const { actions } = useReloo();
  const next = loginLanding(params.get("next"));
  const intent = params.get("intent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState(
    oauthMessage(params.get("error")),
  );
  const [googleBusy, setGoogleBusy] = useState(false);
  async function login(event) {
    event.preventDefault();
    if (busy || googleBusy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier:email, password }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Chưa đăng nhập được.");
      const user = await actions.refreshSession();
      router.push(
        user.profileComplete === false
          ? authLink("/auth/complete", next, intent)
          : next !== "/"
            ? next
            : "/",
      );
    } catch (cause) {
      setError(
        cause.name === "TimeoutError"
          ? "Kết nối mất nhiều thời gian. Vui lòng thử lại."
          : cause.message || "Chưa đăng nhập được.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell next={next} intent={intent}>
      <div className="auth-site__heading">
        <span className="auth-site__kicker">CHÀO MỪNG TRỞ LẠI</span>
        <h2>Đăng nhập RELOO</h2>
        <p>Tiếp tục cuộc trò chuyện, tìm đồ thuê hoặc quản lý tin của bạn.</p>
      </div>
      <GoogleAuthButton
        next={next}
        intent={intent}
        disabled={busy||googleBusy}
        onError={setGoogleError}
        onBusyChange={setGoogleBusy}
      />
      <AppleAuthButton next={next} intent={intent} disabled={busy||googleBusy} onError={setGoogleError} onBusyChange={setGoogleBusy}/>
      {googleError && (
        <div className="auth-site__error" role="alert">
          {googleError}
        </div>
      )}

      <div className="auth-method-divider">
        <span>{t.identifier}</span>
      </div>
      <form onSubmit={login} className="auth-site__form" aria-busy={busy}>
        <label htmlFor="login-email">{t.identifier}</label>
        <div className="auth-field-control">
          <Mail size={17} aria-hidden="true" />
          <input
            id="login-email"
            type="text"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.identifier}
          />
        </div>
        <div className="auth-field-label">
          <label htmlFor="login-password">Mật khẩu</label>
        </div>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nhập mật khẩu của bạn"
        />
        <div className="auth-password-help"><Link href={authLink('/auth/recover',next,intent)}>Quên mật khẩu?</Link></div>
        {error && (
          <div className="auth-site__error" role="alert">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary auth-site__submit"
          disabled={busy || googleBusy}
        >
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <ArrowRight size={18} />
          )}
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
      <div className="auth-site__trust">
        <ShieldCheck size={20} />
        <p>
          Một tài khoản cho cả thuê và cho thuê.
          <br />
          <span>RELOO không nhận hoặc giữ tiền giao dịch.</span>
        </p>
      </div>
      <p className="auth-site__switch">
        Lần đầu đến RELOO?{" "}
        <Link href={authLink("/auth/register", next, intent)}>
          Tạo tài khoản
        </Link>
      </p>
    </AuthShell>
  );
}
