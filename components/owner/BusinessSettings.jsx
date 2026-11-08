"use client";
import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  Save,
  ShieldCheck,
} from "lucide-react";
import { ENTITY_FIELDS } from "@/lib/operations/entity-fields";
import {EmailPreview} from './EmailPreview';
import {NotificationRules} from './NotificationRules';
import {LocalBrandManager} from './LocalBrandManager';
import {notifyBusinessChanged} from '@/components/settings/useBusinessEntity';
const PROVIDERS = {
  VNPT: "VNPT eKYC",
  SEPAY: "SePay & hóa đơn điện tử",
  EVM: "Neo bằng chứng EVM",
  TWENTY: "Twenty CRM",
  GMAIL: "Gmail · thông báo email",
};
const CONFIG_FIELDS = {
  VNPT: {
    sdkIosUrl: "Gói SDK iOS được cấp",
    sdkAndroidUrl: "Gói SDK Android được cấp",
  },
  SEPAY: {
    companyAccountNumber: "Tài khoản ngân hàng thu tiền",
    bankAccountId:'UUID tài khoản ngân hàng tại SePay',
    invoiceAccountId:'UUID tài khoản nhà cung cấp hóa đơn',
    vaPrefix: "Tiền tố tài khoản ảo",
    tid:'Terminal ID Vietcombank',
    bankName:'Ngân hàng thu tiền',
    custodyModel:'Mô hình thu tiền (COLLECTION)',
  },
  EVM: {
    chainId: "Chain ID",
    contractAddress: "Hợp đồng neo bằng chứng",
    confirmations: "Số xác nhận yêu cầu",
    maxFeeWei:'Hạn mức phí tối đa mỗi bản ghi (wei)',
  },
  TWENTY: {},
  GMAIL: {sender:'Địa chỉ Gmail gửi thông báo'},
};
async function api(body) {
  const response = await fetch(
      "/api/crm/settings",
      body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {},
    ),
    data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
export function BusinessSettings() {
  const [confirmOfficial,setConfirmOfficial]=useState(false);
  const [data, setData] = useState(null),
    [entity, setEntity] = useState({}),
    [editing, setEditing] = useState(null),
    [tab, setTab] = useState("entity"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const result = await api();
    setData(result);
    setEntity(result.business.entity);
  }
  useEffect(() => {
    const timer = setTimeout(
      () => load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(
        tab === "entity"
          ? { kind: "entity", version: data.business.version, entity,confirmOfficial }
          : { kind: "integration", ...editing },
      );
      await load();
      if(tab==='entity')notifyBusinessChanged();
      setEditing(null);
      setSuccess("Đã lưu cấu hình.");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="business-settings">
      <nav className="settings-tabs" aria-label="Khai báo hệ thống">
        {[
          ["entity", "Pháp nhân"],
          ["integrations", "Kết nối dịch vụ"],
          ["localBrands", "Local Brand"],
          ["deposit", "Chương trình ký quỹ"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setEditing(null);
              setError("");
              setSuccess("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
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
      {!data ? (
        <p>
          <LoaderCircle size={18} className="spin" /> Đang tải cấu hình...
        </p>
      ) : (
        <>
          {tab === "entity" && (
            <form onSubmit={save}>
              {data.business.entityDraft&&<aside className="security-notice"><strong>Thông tin mẫu · bản nháp</strong><p>{data.business.entityDraft.legalName}<br/>{data.business.entityDraft.address}<br/>{data.business.entityDraft.privacyEmail}</p><p>Chưa công khai và chưa dùng để tiếp nhận giấy tờ.</p><button type="button" className="btn btn-secondary" onClick={()=>{setEntity({...entity,...Object.fromEntries(['legalName','address','privacyEmail'].map(key=>[key,data.business.entityDraft[key]||'']))});setConfirmOfficial(false);}}>Điền mẫu vào biểu mẫu</button></aside>}
              <div className="profile-section-heading">
                <h2>Thông tin đơn vị vận hành</h2>
                <span className="profile-tag">
                  {data.business.entityReady
                    ? "Đã khai báo thông tin"
                    : "Chưa đủ thông tin pháp nhân"}
                </span>
              </div>
              <fieldset
                disabled={busy}
                className="ops-form-grid settings-fields"
              >
                {Object.entries(ENTITY_FIELDS).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      className="input"
                      maxLength={500}
                      type={key.endsWith("Email") ? "email" : "text"}
                      value={entity[key] || ""}
                      onChange={(event) =>
                        setEntity({ ...entity, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
              </fieldset>
              {data.business.entityDraft&&<label className="identity-ack"><input type="checkbox" required checked={confirmOfficial} onChange={e=>setConfirmOfficial(e.target.checked)}/><span>Tôi xác nhận thông tin đã chỉnh sửa là thông tin chính thức của đơn vị tiếp nhận.</span></label>}
              <button className="btn btn-primary" disabled={busy}>
                <Save size={17} />
                Lưu & đồng bộ
              </button>
              <p className="profile-note">
                Nội dung mới được áp dụng cho thông tin công khai và tài liệu
                tạo sau khi lưu. Chứng từ, điều khoản đã chấp nhận giữ phiên bản
                tại thời điểm phát sinh.
              </p>
            </form>
          )}
          {tab === "localBrands" && <LocalBrandManager/>}
          {tab === "integrations" && (
            <>
              <EmailPreview/>
              <NotificationRules/>
              <div className="settings-integrations">
                {data.integrations.map((item) => (
                  <section key={item.provider} className="integration-row">
                    <div>
                      <h2>{PROVIDERS[item.provider]}</h2>
                      <p>
                        {item.configured
                          ? "Đã khai báo khóa dịch vụ"
                          : "Chưa đủ khóa dịch vụ"}
                        {item.healthStatus==='VNPT_AUTH_REQUIRED'&&' · API đang từ chối quyền truy cập'}
                        {item.paused && ' · Tạm dừng VNPT, hồ sơ do admin kiểm duyệt'}
                        {!item.paused && item.expiresAt &&
                          ` · Access token hết hạn: ${new Date(item.expiresAt).toLocaleString("vi-VN")}`}
                      </p>
                    </div>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        setEditing({
                          provider: item.provider,
                          version: item.version,
                          secrets: {},
                          config: item.provider==='GMAIL'?{sender:'norepy.reloo@gmail.com',...item.config}:item.config,
                        });
                        setSuccess("");
                      }}
                    >
                      Cấu hình
                    </button>
                  </section>
                ))}
              </div>
              {editing && (
                <form onSubmit={save} className="integration-editor">
                  <h3>{PROVIDERS[editing.provider]}</h3>
                  <fieldset
                    disabled={busy}
                    className="ops-form-grid settings-fields"
                  >
                    {data.integrations
                      .find((item) => item.provider === editing.provider)
                      .secretFields.map(({ key, present }) => (
                        <label key={key}>
                          {key}
                          <input
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            maxLength={6000}
                            placeholder={
                              present
                                ? "Đã có khóa. Để trống để giữ nguyên."
                                : "Nhập khóa dịch vụ"
                            }
                            value={editing.secrets[key] || ""}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                secrets: {
                                  ...editing.secrets,
                                  [key]: event.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    {Object.entries(CONFIG_FIELDS[editing.provider]).map(
                      ([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            className="input"
                            type={
                              ["chainId", "confirmations"].includes(key)
                                ? "number"
                                : "text"
                            }
                            min="1"
                            maxLength={500}
                            value={editing.config[key] ?? ""}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                config: {
                                  ...editing.config,
                                  [key]: ["chainId", "confirmations"].includes(
                                    key,
                                  )
                                    ? Number(event.target.value)
                                    : event.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      ),
                    )}
                  </fieldset>
                  <div className="profile-actions">
                    <button className="btn btn-primary" disabled={busy}>
                      <Save size={17} />
                      Lưu cấu hình
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => setEditing(null)}
                    >
                      Đóng
                    </button>
                  </div>
                  {editing.provider === "VNPT" && (
                    <a
                      className="settings-doc"
                      href="https://ekyc.vnpt.vn/admin-dashboard/console/project-manager"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Quản lý Token VNPT <ExternalLink size={15} />
                    </a>
                  )}
                </form>
              )}
            </>
          )}
          {tab === "deposit" && (
            <div>
              <div className="profile-section-heading">
                <h2>Chính sách ký quỹ</h2>
                <ShieldCheck size={23} />
              </div>
              <p className="profile-note">
                Tài khoản ảo SePay dùng để nhận diện dòng tiền về tài khoản
                chính. Việc này không tự thiết lập dịch vụ ngân hàng giữ ký quỹ.
              </p>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={data.business.deposit.enabled}
                  onChange={async (event) => {
                    setBusy(true);
                    setError("");
                    try {
                      await api({
                        kind: "deposit",
                        version: data.business.version,
                        deposit: {
                          ...data.business.deposit,
                          programLabel:
                            data.business.deposit.programLabel ||
                            "Chương trình RELOO",
                          enabled: event.target.checked,
                        },
                      });
                      await load();
                    } catch (cause) {
                      setError(cause.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                />
                Cho phép vận hành có ký quỹ
              </label>
              <p className="profile-note">
                Đang chờ cấu hình ngân hàng giữ ký quỹ, điều khoản chương trình
                và kết nối đối soát. Khi chưa đủ điều kiện, giao dịch vẫn theo
                hình thức hai bên thỏa thuận.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
