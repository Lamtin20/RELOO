"use client";

import { useState } from "react";
import { User, Landmark, Phone, Plus, Trash2, CheckCircle2, Truck } from "lucide-react";
import { useAuth } from "@/lib/store";
import { Badge, TrustScore } from "@/components/ui";
import { BankAccountForm } from "@/components/bank/BankAccountForm";
import { GoshipAddressForm } from "@/components/shipping/GoshipAddressForm";
import { createBankAccountRecord } from "@/lib/customer/store-helpers";
import { emptyGoshipAddress, formatGoshipAddress } from "@/lib/rent-draft";
import { isValidPhone, sanitizePhoneInput, PHONE_ERROR } from "@/lib/utils";

export default function ProfilePage() {
  const { user, updateProfile, saveBankAccount, primaryBankAccount } = useAuth();

  const [form, setForm] = useState(
    user
      ? {
          name: user.name ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
          dateOfBirth: user.dateOfBirth ?? "",
          nationalId: user.nationalId ?? "",
          address: user.address ?? "",
          bio: user.bio ?? "",
        }
      : null
  );
  const [contacts, setContacts] = useState(user?.emergencyContacts ?? []);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [goshipAddress, setGoshipAddress] = useState(
    () => user?.goshipAddress ?? { ...emptyGoshipAddress(), name: user?.name ?? "", phone: user?.phone ?? "" },
  );
  const [goshipErrors, setGoshipErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [contactError, setContactError] = useState("");

  if (!user || !form) return null;

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setSaved(false);
    setFormError("");
  };

  const updatePhone = (e) => {
    setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }));
    setSaved(false);
    setFormError("");
  };

  const addContact = () => {
    if (!newContact.name.trim()) {
      setContactError("Vui lòng nhập tên người liên hệ.");
      return;
    }
    if (!isValidPhone(newContact.phone)) {
      setContactError(PHONE_ERROR);
      return;
    }
    setContactError("");
    setContacts((c) => [...c, { ...newContact, id: `ec_${Date.now()}` }]);
    setNewContact({ name: "", phone: "" });
    setSaved(false);
  };

  const removeContact = (id) => {
    setContacts((c) => c.filter((item) => item.id !== id));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isValidPhone(form.phone)) {
      setFormError(PHONE_ERROR);
      return;
    }
    if (contacts.some((c) => !isValidPhone(c.phone))) {
      setFormError("Liên hệ khẩn cấp cần số điện thoại đúng 10 số.");
      return;
    }
    setFormError("");
    updateProfile({
      ...form,
      emergencyContacts: contacts,
      goshipAddress: {
        ...goshipAddress,
        name: form.name,
        phone: form.phone,
      },
      address: formatGoshipAddress(goshipAddress) || form.address,
    });
    setSaved(true);
  };

  function handleBankSaved({ bank, accountNumber }) {
    const record = createBankAccountRecord({
      customerId: user.id,
      bank,
      accountNumber,
    });
    saveBankAccount(record);
  }

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Hồ sơ cá nhân</h1>
          <p className="text-muted mt-2">
            Quản lý thông tin cá nhân, tài khoản ngân hàng và liên hệ khẩn cấp
          </p>
        </div>
      </div>

      <div className="panel dashboard-profile-header mt-6">
        <img src={user.avatar} alt={user.name} className="dashboard-profile-avatar" />
        <div>
          <h2>{user.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="green">{user.kycLevel}</Badge>
            <span className="text-sm text-muted">
              Tham gia từ {new Date(user.joinedAt).getFullYear()}
            </span>
            {user.isPro && <Badge variant="warning">Pro Store</Badge>}
          </div>
        </div>
        <div className="dashboard-profile-header__score">
          <TrustScore score={Math.round((user.trustScore ?? 0) / 10)} size={64} showLabel={false} />
          <span className="text-xs text-muted mt-1">{user.trustScore ?? 0} điểm</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="panel mt-6">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <User size={18} className="text-green" />
              <h2 className="panel-title">Thông tin cơ bản</h2>
            </div>
          </div>

          <div className="dashboard-form-row">
            <div className="input-group">
              <label className="input-label" htmlFor="name">
                Họ và tên
              </label>
              <input id="name" className="input" value={form.name} onChange={update("name")} />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="phone">
                Số điện thoại
              </label>
              <input
                id="phone"
                className="input"
                inputMode="numeric"
                maxLength={10}
                placeholder="09xxxxxxxx"
                value={form.phone}
                onChange={updatePhone}
              />
              <span className="input-hint">Nhập đúng 10 số, bắt đầu bằng 0</span>
              {formError && (
                <span className="input-hint" style={{ color: "var(--danger)" }}>
                  {formError}
                </span>
              )}
            </div>
          </div>

          <div className="dashboard-form-row">
            <div className="input-group">
              <label className="input-label" htmlFor="dateOfBirth">
                Ngày tháng năm sinh
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className="input"
                value={form.dateOfBirth}
                onChange={update("dateOfBirth")}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="nationalId">
                Căn cước công dân
              </label>
              <input
                id="nationalId"
                className="input"
                inputMode="numeric"
                maxLength={12}
                placeholder="12 số trên CCCD"
                value={form.nationalId}
                onChange={update("nationalId")}
              />
            </div>
          </div>

          <div className="input-group mt-4">
            <label className="input-label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" className="input" value={form.email} onChange={update("email")} />
          </div>

          <div className="input-group mt-4">
            <label className="input-label" htmlFor="address">
              Địa chỉ (hiển thị nhanh)
            </label>
            <input id="address" className="input" value={form.address} onChange={update("address")} />
            <span className="input-hint">
              Địa chỉ giao hàng chi tiết (Goship) khai báo ở mục bên dưới — dùng khi đặt thuê.
            </span>
          </div>

          <div className="input-group mt-4">
            <label className="input-label" htmlFor="bio">
              Giới thiệu
            </label>
            <textarea id="bio" className="textarea" rows={3} value={form.bio} onChange={update("bio")} />
          </div>
        </div>

        <div className="panel mt-6">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-green" />
              <h2 className="panel-title">Địa chỉ giao hàng (Goship)</h2>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Địa chỉ này được dùng khi bạn thuê tài sản — shipper giao đến đúng nơi bạn đã lưu.
          </p>
          <GoshipAddressForm
            title="Giao hàng"
            value={goshipAddress}
            onChange={(next) => {
              setGoshipAddress(next);
              setGoshipErrors({});
              setSaved(false);
            }}
            errors={goshipErrors}
          />
        </div>

        <div className="panel mt-6">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-green" />
              <h2 className="panel-title">Tài khoản ngân hàng</h2>
            </div>
          </div>
          <BankAccountForm initialAccount={primaryBankAccount} onSaved={handleBankSaved} />
        </div>

        <div className="panel mt-6">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <Phone size={18} className="text-green" />
              <h2 className="panel-title">Liên hệ khẩn cấp</h2>
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="dashboard-contact-list mb-4">
              {contacts.map((c) => (
                <div key={c.id} className="dashboard-contact-row">
                  <div>
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span className="text-xs text-muted block">{c.phone}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => removeContact(c.id)}
                    aria-label="Xóa liên hệ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="dashboard-form-row">
            <input
              className="input"
              placeholder="Tên người liên hệ"
              value={newContact.name}
              onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Số điện thoại"
              inputMode="numeric"
              maxLength={10}
              value={newContact.phone}
              onChange={(e) => {
                setContactError("");
                setNewContact((c) => ({ ...c, phone: sanitizePhoneInput(e.target.value) }));
              }}
            />
          </div>
          {contactError && (
            <span className="input-hint" style={{ color: "var(--danger)" }}>
              {contactError}
            </span>
          )}
          <button type="button" className="btn btn-secondary btn-sm mt-4" onClick={addContact}>
            <Plus size={14} /> Thêm liên hệ
          </button>
        </div>

        <div className="dashboard-form-actions mt-6">
          {saved && (
            <span className="dashboard-save-confirm">
              <CheckCircle2 size={16} /> Đã lưu thay đổi
            </span>
          )}
          <button type="submit" className="btn btn-primary">
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}
