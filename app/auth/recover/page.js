"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { safeNextPath } from "@/lib/auth-navigation";
export default function RecoverPage() {
  return (
    <Suspense
      fallback={
        <AuthShell mode="recover">
          <p role="status">Đang tải...</p>
        </AuthShell>
      }
    >
      <RecoverForm />
    </Suspense>
  );
}
function RecoverForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function recover(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSent(true);
    } catch (cause) {
      setError(
        cause.name === "TimeoutError"
          ? "Kết nối đang chậm. Vui lòng thử lại sau."
          : cause.message || "Chưa gửi được yêu cầu.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      mode="recover"
      next={safeNextPath(params.get("next"))}
      intent={params.get("intent")}
    >
      <div className="auth-site__heading">
        <span className="auth-site__kicker">TRỞ LẠI TÀI KHOẢN CỦA BẠN</span>
        <h2>Quên mật khẩu?</h2>
        <p>Nhập email bạn dùng để đăng ký RELOO.</p>
      </div>
      {sent ? (
        <div className="auth-site__registered" role="status">
          <CheckCircle2 size={38} />
          <p>
            Nếu email này có tài khoản, bạn sẽ nhận được liên kết đặt lại mật
            khẩu. Kiểm tra hộp thư và thư rác.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSent(false)}
          >
            Dùng email khác
          </button>
        </div>
      ) : (
        <form className="auth-site__form" onSubmit={recover}>
          <label htmlFor="recover-email">Email đăng ký</label>
          <div className="auth-field-control">
            <Mail size={17} />
            <input
              id="recover-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập mail của bạn"
            />
          </div>
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
            Gửi liên kết khôi phục
          </button>
        </form>
      )}
    </AuthShell>
  );
}
