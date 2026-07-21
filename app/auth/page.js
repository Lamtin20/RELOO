"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, User } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { Mascot } from "@/components/brand/Mascot";
import { useAuth } from "@/lib/store";
import { isValidPhone, sanitizePhoneInput, PHONE_ERROR } from "@/lib/utils";

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Tiếp tục với Google", icon: "G", color: "#4285F4" },
  { id: "facebook", label: "Tiếp tục với Facebook", icon: "f", color: "#1877F2" },
  { id: "zalo", label: "Tiếp tục với Zalo", icon: "Z", color: "#0068FF" },
];

const DEMO_ACCOUNTS = [
  { id: "user_lan", label: "Người thuê", email: "lan.tran@gmail.com" },
  { id: "user_minh", label: "Chủ đồ", email: "minh.nguyen@gmail.com" },
  { id: "user_admin", label: "Quản trị", email: "admin@reloo.vn" },
];

export default function LoginPage() {
  const router = useRouter();
  const { users, login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("phone");

  function handleSocial(id) {
    setError(`Đăng nhập ${id} (demo) - vui lòng dùng SĐT hoặc tài khoản demo bên dưới.`);
  }

  function tryLogin(identifier) {
    const q = identifier.trim().toLowerCase();
    const found = users.find(
      (u) => u.email.toLowerCase() === q || u.phone === q.replace(/\D/g, "")
    );
    if (!found) return null;
    login(found.id);
    router.push("/");
    return found;
  }

  function handleIdentifierChange(value) {
    if (value.includes("@")) {
      setPhone(value);
    } else {
      setPhone(sanitizePhoneInput(value));
    }
    setError("");
  }

  function handleContinue(e) {
    e.preventDefault();
    setError("");
    const raw = phone.trim();
    if (!raw) {
      setError("Vui lòng nhập số điện thoại hoặc email.");
      return;
    }
    if (!raw.includes("@") && !isValidPhone(raw)) {
      setError(PHONE_ERROR);
      return;
    }
    if (mode === "phone" && !password) {
      setMode("password");
      return;
    }
    if (!tryLogin(raw)) {
      setError("Không tìm thấy tài khoản. Đăng ký mới hoặc dùng tài khoản demo.");
    }
  }

  function handleDemo(userId) {
    login(userId);
    router.push("/");
  }

  return (
    <MarketplaceShell>
      <div className="auth-ct">
        <Link href="/" className="auth-ct__back">
          <ArrowLeft size={20} />
        </Link>

        <div className="auth-ct__head">
          <h1>Đăng nhập / Đăng ký</h1>
          <Mascot size="xs" className="auth-ct__mascot" />
        </div>

        <div className="auth-ct__social">
          {SOCIAL_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="auth-ct__social-btn"
              onClick={() => handleSocial(p.id)}
            >
              <span className="auth-ct__social-ic" style={{ color: p.color }}>
                {p.icon}
              </span>
              {p.label}
            </button>
          ))}
        </div>

        <div className="auth-ct__divider">
          <span>Hoặc</span>
        </div>

        <form className="auth-ct__form" onSubmit={handleContinue}>
          <input
            type="text"
            inputMode="tel"
            className="auth-ct__input"
            placeholder="Số điện thoại hoặc email"
            value={phone}
            onChange={(e) => handleIdentifierChange(e.target.value)}
            maxLength={phone.includes("@") ? undefined : 10}
            autoComplete="username"
          />

          {mode === "password" && (
            <div className="auth-ct__pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                className="auth-ct__input"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-ct__eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Ẩn/hiện mật khẩu"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className={`btn btn-ct btn-lg auth-ct__submit ${!phone.trim() ? "is-disabled" : ""}`}
            disabled={!phone.trim()}
          >
            {mode === "phone" ? "Tiếp tục" : "Đăng nhập"}
          </button>
        </form>

        <p className="auth-ct__register">
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="auth-wrap__link">
            Đăng ký ngay
          </Link>
        </p>

        <div className="auth-ct__demo">
          <span className="auth-ct__demo-label">Tài khoản demo</span>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              type="button"
              className="auth-ct__demo-btn"
              onClick={() => handleDemo(acc.id)}
            >
              <User size={14} />
              <span>
                <strong>{acc.label}</strong> · {acc.email}
              </span>
            </button>
          ))}
        </div>

        <div className="auth-ct__footer">
          <Link href="/cms/terms">Quy chế hoạt động sàn</Link>
          <span>|</span>
          <Link href="/cms/privacy">Chính sách bảo mật</Link>
          <span>|</span>
          <Link href="/help">Liên hệ hỗ trợ</Link>
        </div>
      </div>
    </MarketplaceShell>
  );
}
