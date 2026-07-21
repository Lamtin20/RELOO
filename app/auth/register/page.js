"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  Lock,
  User,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  Package,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { useAuth, useReloo } from "@/lib/store";
import { Logo } from "@/components/brand/Logo";
import { Mascot } from "@/components/brand/Mascot";
import { LocationPicker } from "@/components/location/LocationPicker";
import { formatAddressString } from "@/lib/vn-address";
import { isValidPhone, sanitizePhoneInput, PHONE_ERROR } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Thông tin" },
  { id: 2, label: "Xác thực OTP" },
  { id: 3, label: "Hoàn tất" },
];

const ROLE_OPTIONS = [
  {
    id: "renter",
    label: "Tôi muốn thuê đồ",
    desc: "Tìm và thuê tài sản trên RELOO",
    icon: Package,
  },
  {
    id: "lender",
    label: "Tôi muốn cho thuê",
    desc: "Đăng tin & sinh lời từ đồ ít dùng",
    icon: Store,
  },
  {
    id: "both",
    label: "Cả hai",
    desc: "Vừa thuê, vừa cho thuê",
    icon: ShieldCheck,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser, users } = useAuth();
  const { state, actions } = useReloo();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    location: state.guestLocation || { province: null, ward: null },
    street: "",
    role: "renter",
    agree: false,
  });
  const [otpPhone, setOtpPhone] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validateStep1() {
    if (!form.name.trim()) return "Vui lòng nhập họ tên.";
    if (!isValidPhone(form.phone.trim()))
      return PHONE_ERROR;
    if (!/\S+@\S+\.\S+/.test(form.email.trim()))
      return "Email không hợp lệ.";
    if (form.password.length < 6)
      return "Mật khẩu tối thiểu 6 ký tự.";
    if (form.password !== form.confirmPassword)
      return "Xác nhận mật khẩu không khớp.";
    if (!form.location?.province) return "Vui lòng chọn tỉnh/thành phố của bạn.";
    if (!form.location?.ward) return "Vui lòng chọn phường/xã của bạn.";
    if (!form.agree) return "Bạn cần đồng ý Điều khoản để tiếp tục.";
    if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase()))
      return "Email đã được đăng ký.";
    if (users.some((u) => u.phone === form.phone.trim()))
      return "Số điện thoại đã được đăng ký.";
    return null;
  }

  function handleNext() {
    setError("");
    if (step === 1) {
      const err = validateStep1();
      if (err) return setError(err);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (otpPhone.length !== 6 || otpEmail.length !== 6) {
        return setError("Vui lòng nhập đủ 6 số OTP cho cả SMS và Email.");
      }
      const address = formatAddressString({
        street: form.street.trim(),
        ward: form.location.ward,
        province: form.location.province,
      });
      registerUser({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address,
        role: form.role,
      });
      actions.setGuestLocation(form.location);
      setStep(3);
      return;
    }
  }

  return (
    <MarketplaceShell>
      <div className="reg-wrap">
        <div className="reg-wrap__inner">
          <div className="reg-brand-row">
            <Logo size="lg" />
          </div>

          <ol className="reg-steps">
            {STEPS.map((s) => (
              <li
                key={s.id}
                className={`reg-step ${step === s.id ? "reg-step--active" : ""} ${
                  step > s.id ? "reg-step--done" : ""
                }`}
              >
                <span className="reg-step__num">
                  {step > s.id ? <Check size={14} /> : s.id}
                </span>
                <span className="reg-step__label">{s.label}</span>
              </li>
            ))}
          </ol>

          {step === 1 && (
            <div className="reg-form">
              <h1>Đăng ký tài khoản RELOO</h1>
              <p className="text-muted">
                Đã có tài khoản?{" "}
                <Link href="/auth" className="auth-wrap__link">
                  Đăng nhập
                </Link>
              </p>

              <div className="reg-role">
                {ROLE_OPTIONS.map((r) => {
                  const IconEl = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`reg-role__opt ${
                        form.role === r.id ? "reg-role__opt--active" : ""
                      }`}
                      onClick={() => update("role", r.id)}
                    >
                      <IconEl size={20} />
                      <div>
                        <strong>{r.label}</strong>
                        <span>{r.desc}</span>
                      </div>
                      {form.role === r.id && (
                        <span className="reg-role__check">
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="auth-field">
                <span>Họ và tên</span>
                <div className="auth-input">
                  <User size={15} />
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div className="reg-grid-2">
                <div className="auth-field">
                  <span>Số điện thoại</span>
                  <div className="auth-input">
                    <Phone size={15} />
                    <input
                      inputMode="numeric"
                      value={form.phone}
                      onChange={(e) => update("phone", sanitizePhoneInput(e.target.value))}
                      placeholder="09xxxxxxxx"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <span>Email</span>
                  <div className="auth-input">
                    <Mail size={15} />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="reg-grid-2">
                <div className="auth-field">
                  <span>Mật khẩu</span>
                  <div className="auth-input">
                    <Lock size={15} />
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                    <button
                      type="button"
                      className="auth-input__eye"
                      onClick={() => setShowPass((v) => !v)}
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <span>Xác nhận mật khẩu</span>
                  <div className="auth-input">
                    <Lock size={15} />
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                    />
                  </div>
                </div>
              </div>

              <LocationPicker
                value={form.location}
                onChange={(loc) => update("location", loc)}
                includeStreet
                streetValue={form.street}
                onStreetChange={(v) => update("street", v)}
                autoGeo
                label="Địa chỉ hiện tại"
              />
              <p className="auth-hint">
                RELOO sẽ gợi ý tin cho thuê gần bạn nhất dựa trên khu vực này.
              </p>

              <label className="auth-check auth-check--block">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e) => update("agree", e.target.checked)}
                />
                <span>
                  Tôi đồng ý với{" "}
                  <Link href="/cms/terms" className="auth-wrap__link">
                    Quy chế hoạt động
                  </Link>{" "}
                  và{" "}
                  <Link href="/cms/privacy" className="auth-wrap__link">
                    Chính sách bảo mật
                  </Link>{" "}
                  của RELOO.
                </span>
              </label>

              {error && <div className="auth-error">{error}</div>}

              <button
                type="button"
                className="btn btn-primary btn-lg auth-form__submit"
                onClick={handleNext}
              >
                Tiếp tục xác thực OTP <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="reg-form">
              <h1>Xác thực OTP - eKYC Cấp 1</h1>
              <p className="text-muted">
                Chúng tôi đã gửi 2 mã OTP đến SMS &amp; Email của bạn (demo: nhập bất kỳ 6
                số).
              </p>

              <div className="reg-otp">
                <div>
                  <div className="reg-otp__label">
                    <Phone size={13} /> Mã SMS gửi đến {form.phone}
                  </div>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    className="reg-otp__input"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                  />
                </div>

                <div>
                  <div className="reg-otp__label">
                    <Mail size={13} /> Mã Email gửi đến {form.email}
                  </div>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    className="reg-otp__input"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value.replace(/\D/g, ""))}
                    placeholder="654321"
                  />
                </div>
              </div>

              <div className="reg-kyc-note">
                <ShieldCheck size={15} />
                <div>
                  <strong>Đây là bước eKYC Cấp 1 (Basic)</strong>
                  <p>
                    Hạn mức thuê tối đa 500.000₫. Sau khi hoàn tất, bạn có thể nâng cấp lên{" "}
                    <strong>Cấp 2</strong> (CCCD + Face Match) trong trang eKYC để tăng hạn
                    mức lên 5.000.000₫ và miễn/giảm cọc.
                  </p>
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="reg-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Quay lại
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleNext}
                >
                  Xác nhận đăng ký <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="reg-form reg-done">
              <Mascot size="md" className="reg-done__mascot" />
              <div className="reg-done__ic">
                <Check size={28} />
              </div>
              <h1>Tài khoản đã sẵn sàng!</h1>
              <p className="text-muted">
                Chào mừng {form.name.split(" ").slice(-1)[0]} đến với RELOO. Bạn đang ở cấp
                định danh <strong>Cấp 1 (Basic)</strong>, có thể thuê đồ trị giá đến{" "}
                <strong>500.000₫</strong>.
              </p>

              <div className="reg-next">
                <Link href="/dashboard/kyc/verify" className="reg-next__item">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>Nâng cấp lên Cấp 2 (Verified)</strong>
                    <span>Chụp CCCD + Face Match để thuê đồ đến 5 triệu và giảm cọc</span>
                  </div>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/explore" className="reg-next__item">
                  <Package size={20} />
                  <div>
                    <strong>Bắt đầu tìm đồ để thuê</strong>
                    <span>Khám phá gần 1.000 tin đang mở trong khu vực TP.HCM</span>
                  </div>
                  <ArrowRight size={16} />
                </Link>
                {(form.role === "lender" || form.role === "both") && (
                  <Link href="/dashboard/assets/new" className="reg-next__item">
                    <Store size={20} />
                    <div>
                      <strong>Đăng tin cho thuê đầu tiên</strong>
                      <span>Miễn phí đăng tin, phí sàn chỉ 15% khi có đơn thành công</span>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.push("/")}
              >
                Về trang chủ
              </button>
            </div>
          )}
        </div>
      </div>
    </MarketplaceShell>
  );
}
