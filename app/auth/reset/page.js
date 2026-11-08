"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  validatePassword,
} from "@/lib/password-policy";
export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function reset(event) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSaved(true);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause.name === "TimeoutError"
          ? "Chưa nhận được xác nhận. Vui lòng thử lại."
          : cause.message || "Chưa đổi được mật khẩu.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell mode="reset">
      <div className="auth-site__heading">
        <h2>{saved ? "Đã đổi mật khẩu" : "Đặt mật khẩu mới"}</h2>
        <p>
          {saved
            ? "Bạn có thể tiếp tục sử dụng tài khoản RELOO."
            : "Sử dụng liên kết trong email khôi phục để tiếp tục."}
        </p>
      </div>
      {saved ? (
        <div className="auth-site__registered">
          <CheckCircle2 size={38} />
          <Link href="/safety" className="btn btn-primary">
            Đến tài khoản <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <form className="auth-site__form" onSubmit={reset}>
          <label htmlFor="reset-password">Mật khẩu mới</label>
          <PasswordInput
            id="reset-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            aria-describedby="reset-password-requirements"
          />
          <PasswordRequirements
            value={password}
            id="reset-password-requirements"
          />
          <label htmlFor="reset-confirm">Xác nhận mật khẩu mới</label>
          <PasswordInput
            id="reset-confirm"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Nhập lại mật khẩu mới"
          />
          {error && (
            <div className="auth-site__error" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary auth-site__submit"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <ArrowRight size={18} />
            )}{" "}
            Lưu mật khẩu mới
          </button>
        </form>
      )}
    </AuthShell>
  );
}
