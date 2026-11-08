"use client";
import {RentalContinuation} from "@/components/neighborhood/RentalContinuation";
import {ResidenceSettings} from "@/components/neighborhood/ResidenceSettings";
import {IdentityNotice} from "@/components/profile/IdentityNotice";
import Image from 'next/image';
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {
  ArrowRight,
  Check,
  IdCard,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { BankPicker } from "@/components/profile/BankPicker";
import { DeleteAccount } from "@/components/profile/DeleteAccount";
import { AddressFields } from "@/components/location/AddressFields";
import {LanguageSettingsLink} from '@/components/settings/LanguageSettingsLink';
const SECTIONS = [
  ["personal", "Cá nhân", UserRound],
  ["address", "Địa chỉ", MapPin],
  ["bank", "Ngân hàng", Landmark],
  ["security", "Bảo mật", ShieldCheck],
];
const EMPTY_ADDRESS = {
  province: null,
  ward: null,
  house: "",
  street: "",
  hamlet: "",
  note: "",
  type: "HOME",
};
const EMPTY_BANK = {
  bank: null,
  number: "",
  holder: "",
  branch: "",
  isDefault: true,
  consent: false,
};
async function request(path, body, method = "POST") {
  const response = await fetch(
    path,
    body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw new Error(result.error || "Chưa tải được thông tin.");
  return result;
}
export default function ProfilePage() {
  const { user, refreshSession } = useAuth();
  const userId = user?.id;
  const params=useSearchParams();
  const [section, setSection] = useState(()=>["personal","address","bank","security"].includes(params.get("section"))?params.get("section"):"personal"),
    [form, setForm] = useState({ name: "", bio: "" }),
    [address, setAddress] = useState(EMPTY_ADDRESS),
    [legacyAddress, setLegacyAddress] = useState(""),
    [banks, setBanks] = useState([]),
    [bank, setBank] = useState(EMPTY_BANK),
    [bankOpen, setBankOpen] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    const [profile, accounts] = await Promise.all([
      request("/api/profile"),
      request("/api/profile/banks"),
    ]);
    setForm({
      name: profile.profile.name || "",
      bio: profile.details.bio || "",
    });
    setAddress({ ...EMPTY_ADDRESS, ...profile.details.addressDetails });
    setLegacyAddress(profile.details.address || "");
    setBanks(accounts.accounts);
  }, []);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      if (userId)
        load()
          .catch((cause) => alive && setError(cause.message))
          .finally(() => alive && setLoading(false));
    }, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [userId, load]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await request(
        "/api/profile",
        section === "address" ? { addressDetails: address } : form,
        "PUT",
      );
      await refreshSession();
      setSuccess(
        section === "address" ? "Đã lưu địa chỉ." : "Đã lưu thông tin cá nhân.",
      );
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveBank(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await request("/api/profile/banks", {
        bin: bank.bank?.bin,
        number: bank.number,
        holder: bank.holder,
        branch: bank.branch,
        isDefault: bank.isDefault,
        consent: bank.consent,
      });
      setBank(EMPTY_BANK);
      setBankOpen(false);
      await load();
      setSuccess("Đã lưu ngân hàng và tiếp nhận thông tin đối chiếu.");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  async function manageBank(id, action) {
    setBusy(true);
    setError("");
    try {
      await request("/api/profile/banks", { id, action }, "PATCH");
      await load();
      setSuccess(
        action === "DEFAULT"
          ? "Đã đổi ngân hàng mặc định."
          : "Đã xóa tài khoản ngân hàng khỏi hồ sơ.",
      );
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  if (!user) return null;
  const locked = user.activationStatus === "RESTRICTED";
  return (
    <div className="dashboard-page profile-page">
      <header className="profile-header">
        <div className="profile-avatar">
          <UserRound size={30} />
        </div>
        <div>
          <h1>Hồ sơ cá nhân</h1>
          <p>{user.name}</p>
        </div>
        <Link className="btn btn-secondary" href="/dashboard/kyc/verify">
          <IdCard size={18} />
          Xác minh căn cước
        </Link>
      </header>
<IdentityNotice profileId={user.id}/>
      <div className="profile-layout">
        <nav className="profile-nav" aria-label="Các phần hồ sơ">
          {SECTIONS.map(([key, label, Icon]) => (
            <button
              type="button"
              key={key}
              className={section === key ? "active" : ""}
              aria-current={section === key ? "page" : undefined}
              onClick={() => {
                setSection(key);
                setError("");
                setSuccess("");
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="profile-content">
          <LanguageSettingsLink/>
          {locked && (
            <p className="ops-error">
              Tài khoản đang hạn chế chỉnh sửa.{" "}
              <Link href="/safety">Yêu cầu xem xét</Link>
            </p>
          )}
          {error && (
            <p className="ops-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="feature-success" role="status">
              <Check size={17} />
              {success}
            </p>
          )}
          {loading ? (
            <p role="status">
              <LoaderCircle className="spin" size={20} /> Đang tải hồ sơ...
            </p>
          ) : (
            <>
              {section === "personal" && (
                <form onSubmit={save}>
                  <div className="profile-section-heading">
                    <h2>Thông tin cá nhân</h2>
                    <span className="profile-tag">
                      <ShieldCheck size={15} />
                      {["L2", "L3"].includes(user.kycLevel)
                        ? "Đã xác minh căn cước"
                        : "Chưa xác minh căn cước"}
                    </span>
                  </div>
                  <fieldset disabled={locked || busy}>
                    <label>
                      Họ và tên
                      <input
                        className="input"
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={form.name}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                      />
                    </label>
                    <div className="profile-grid">
                      <label>
                        <span>
                          <Mail size={16} />
                          Email cá nhân
                        </span>
                        <div className="profile-locked">
                          <input
                            className="input"
                            readOnly
                            value={user.email || ""}
                            aria-label="Email đăng ký"
                          />
                          <LockKeyhole size={16} />
                        </div>
                      </label>
                      <label>
                        <span>
                          <Phone size={16} />
                          Số điện thoại đăng ký
                        </span>
                        <div className="profile-locked">
                          <input
                            className="input"
                            readOnly
                            value={user.phone || ""}
                            aria-label="Số điện thoại đăng ký"
                          />
                          <LockKeyhole size={16} />
                        </div>
                      </label>
                    </div>
                    <label>
                      Giới thiệu
                      <textarea
                        className="input"
                        rows={4}
                        maxLength={1500}
                        value={form.bio}
                        onChange={(event) =>
                          setForm({ ...form, bio: event.target.value })
                        }
                      />
                    </label>
                    <button className="btn btn-primary">
                      <Save size={17} />
                      Lưu thông tin
                    </button>
                  </fieldset>
                </form>
              )}
              {section === "personal"&&<><RentalContinuation/><ResidenceSettings/></>}
              {section === "address" && (
                <form onSubmit={save}>
                  <div className="profile-section-heading">
                    <h2>Địa chỉ liên hệ</h2>
                    <MapPin size={22} />
                  </div>
                  <fieldset disabled={locked || busy}>
                    {legacyAddress && !address.province && (
                      <p className="profile-note">
                        Địa chỉ đã lưu: {legacyAddress}
                      </p>
                    )}
                    <AddressFields
                      value={address}
                      onChange={setAddress}
                      label=""
                    />
                    <fieldset className="profile-address-type">
                      <legend>Loại địa chỉ</legend>
                      {[
                        ["HOME", "Nhà riêng"],
                        ["OFFICE", "Văn phòng"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          <input
                            type="radio"
                            name="address-type"
                            checked={address.type === key}
                            onChange={() =>
                              setAddress({ ...address, type: key })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      Ghi chú giao nhận
                      <textarea
                        className="input"
                        rows={3}
                        maxLength={300}
                        value={address.note}
                        onChange={(event) =>
                          setAddress({ ...address, note: event.target.value })
                        }
                      />
                    </label>
                    <button className="btn btn-primary">
                      <Save size={17} />
                      Lưu địa chỉ
                    </button>
                  </fieldset>
                </form>
              )}
              {section === "bank" && (
                <>
                  <div className="profile-section-heading">
                    <h2>Ngân hàng nhận tiền</h2>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={locked}
                      onClick={() => setBankOpen(!bankOpen)}
                    >
                      <Plus size={17} />
                      Thêm ngân hàng
                    </button>
                  </div>
                  {!banks.length && !bankOpen && (
                    <div className="profile-empty">
                      <Landmark size={38} />
                      <h3>Chưa có tài khoản nhận tiền</h3>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={locked}
                        onClick={() => setBankOpen(true)}
                      >
                        <Plus size={17} />
                        Thêm ngân hàng
                      </button>
                    </div>
                  )}
                  <div className="profile-bank-list">
                    {banks.map((item) => (
                      <article className="profile-bank" key={item.id}>
                        <Image unoptimized
                          src={item.logo}
                          width={56}
                          height={40}
                          alt={item.bank_name}
                        />
                        <div>
                          <strong>{item.bank_name}</strong>
                          <p>{item.masked_account}</p>
                          <small>
                            {item.name_status === "DECLARED_NAME_MATCH"
                              ? "Tên khai báo khớp căn cước đã xác minh"
                              : "Chờ đối chiếu tên sau xác minh căn cước"}
                          </small>
                        </div>
                        {item.is_default && (
                          <span className="profile-tag">Mặc định</span>
                        )}
                        <div className="profile-bank-tools">
                          {!item.is_default && (
                            <button
                              className="icon-tool"
                              type="button"
                              disabled={locked || busy}
                              title="Đặt làm ngân hàng mặc định"
                              aria-label="Đặt làm ngân hàng mặc định"
                              onClick={() => manageBank(item.id, "DEFAULT")}
                            >
                              <Star size={17} />
                            </button>
                          )}
                          <button
                            className="icon-tool"
                            type="button"
                            disabled={locked || busy}
                            title="Xóa ngân hàng khỏi hồ sơ"
                            aria-label="Xóa ngân hàng khỏi hồ sơ"
                            onClick={() => manageBank(item.id, "REMOVE")}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {bankOpen && (
                    <form onSubmit={saveBank} className="profile-bank-form">
                      <h3>Thêm tài khoản ngân hàng</h3>
                      <fieldset disabled={locked || busy}>
                        <label>
                          Ngân hàng
                          <BankPicker
                            value={bank.bank}
                            onChange={(value) =>
                              setBank({ ...bank, bank: value })
                            }
                          />
                        </label>
                        <div className="profile-grid">
                          <label>
                            Số tài khoản
                            <input
                              className="input"
                              required
                              inputMode="numeric"
                              maxLength={19}
                              value={bank.number}
                              onChange={(event) =>
                                setBank({
                                  ...bank,
                                  number: event.target.value.replace(/\D/g, ""),
                                })
                              }
                            />
                          </label>
                          <label>
                            Tên chủ tài khoản
                            <input
                              className="input"
                              required
                              autoComplete="off"
                              maxLength={100}
                              value={bank.holder}
                              onChange={(event) =>
                                setBank({ ...bank, holder: event.target.value })
                              }
                            />
                          </label>
                        </div>
                        <label>
                          Chi nhánh
                          <input
                            className="input"
                            maxLength={120}
                            value={bank.branch}
                            onChange={(event) =>
                              setBank({ ...bank, branch: event.target.value })
                            }
                          />
                        </label>
                        <label className="profile-check">
                          <input
                            type="checkbox"
                            checked={bank.isDefault}
                            onChange={(event) =>
                              setBank({
                                ...bank,
                                isDefault: event.target.checked,
                              })
                            }
                          />
                          Đặt làm ngân hàng mặc định
                        </label>
                        <label className="profile-check">
                          <input
                            type="checkbox"
                            required
                            checked={bank.consent}
                            onChange={(event) =>
                              setBank({
                                ...bank,
                                consent: event.target.checked,
                              })
                            }
                          />
                          Tôi xác nhận đây là tài khoản của mình, tên khớp căn
                          cước và đồng ý đối chiếu cảnh báo.
                        </label>
                        <div className="profile-actions">
                          <button
                            className="btn btn-primary"
                            disabled={!bank.bank || !bank.consent}
                          >
                            <Save size={17} />
                            Lưu ngân hàng
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setBankOpen(false)}
                          >
                            Hủy
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  )}
                  <p className="profile-note">
                    Thông tin ngân hàng do bạn khai báo. Kết quả đối chiếu tên
                    không thay thế xác nhận sở hữu của ngân hàng.
                  </p>
                </>
              )}
              {section === "security" && (
                <>
                  <div className="profile-section-heading">
                    <h2>Bảo mật & xác minh</h2>
                    <ShieldCheck size={22} />
                  </div>
                  <div className="profile-link-list">
                    {[
                      [
                        "/dashboard/kyc/verify",
                        "Xác minh căn cước",
                        "Giấy tờ và đối chiếu khuôn mặt",
                        IdCard,
                      ],
                      [
                        "/safety",
                        "Trung tâm an toàn",
                        "Cảnh báo và yêu cầu xem xét",
                        ShieldCheck,
                      ],
                      [
                        "/cms/privacy",
                        "Quyền riêng tư",
                        "Dữ liệu cá nhân và lựa chọn cookie",
                        LockKeyhole,
                      ],
                    ].map(([href, title, detail, Icon]) => (
                      <Link key={href} href={href}>
                        <Icon size={22} />
                        <span>
                          <strong>{title}</strong>
                          <small>{detail}</small>
                        </span>
                        <ArrowRight size={18} />
                      </Link>
                    ))}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LockKeyhole size={22} />
                      <span>
                        <strong>Bảo mật tài khoản Google</strong>
                        <small>Quản lý phương thức đăng nhập Google</small>
                      </span>
                      <ArrowRight size={18} />
                    </a>
                  </div>
                  <DeleteAccount />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
