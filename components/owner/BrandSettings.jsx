"use client";
import { useEffect, useState } from "react";
const LABELS = {
  favicon_id: "Icon tab website",
  app_icon_id: "Icon ứng dụng / màn hình chính",
  crm_logo_id: "Logo trong CRM",
};
export function BrandSettings() {
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function load() {
    const r = await fetch("/api/crm/brand").then((r) => r.json());
    if (!r.ok) throw new Error(r.error);
    setSettings(r.settings);
  }
  useEffect(() => {
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(timer);
  }, []);
  async function upload(key, file) {
    if (!file) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("purpose", "brand");
      const image = await fetch("/api/crm/media", {
        method: "POST",
        body: form,
      }).then((r) => r.json());
      if (!image.ok) throw new Error(image.error);
      const r = await fetch("/api/crm/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [key]: image.asset.id,
          version: settings.version,
        }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      await load();
      setNotice("Đã cập nhật thương hiệu. Tải lại website để thấy icon mới.");
      window.dispatchEvent(new Event("reloo-brand-updated"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-editor">
      <h2>Icon & logo thương hiệu</h2>
      {settings && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/crm/brand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  site_title: settings.site_title,
                  shipping_enabled: settings.shipping_enabled,
                  rental_payments_enabled: settings.rental_payments_enabled,
                  version: settings.version,
                }),
              }).then((r) => r.json());
              if (!r.ok) throw new Error(r.error);
              await load();
              setNotice("Đã lưu tiêu đề tab và tính năng giao hàng.");
              window.dispatchEvent(new Event("reloo-brand-updated"));
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Tiêu đề tab website
            <input
              className="input"
              required
              maxLength={150}
              value={
                settings.site_title ||
                "Reloo - Cộng đồng thuê & cho thuê đồ dùng, thiết bị"
              }
              onChange={(e) =>
                setSettings({ ...settings, site_title: e.target.value })
              }
            />
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.shipping_enabled === true}
              onChange={(e) =>
                setSettings({ ...settings, shipping_enabled: e.target.checked })
              }
            />
            Bật tính phí giao hàng trong giao dịch
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.rental_payments_enabled === true}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  rental_payments_enabled: e.target.checked,
                })
              }
            />
            Bật thanh toán giao dịch thuê qua VA
          </label>
          <p>
            Thanh toán cần pháp nhân, điều kiện thu hộ và ngân hàng hỗ trợ VA.
            Công tắc này không tự bật ký quỹ.
          </p>
          <button className="btn btn-primary" disabled={busy}>
            Lưu cấu hình website
          </button>
        </form>
      )}
      <p>
        Icon tab: ảnh vuông tối thiểu 64×64. Icon app: 512×512 trở lên. Logo
        CRM: nền trong suốt, chiều rộng từ 600px. PNG/JPG/WebP tối đa 7,5 MB.
      </p>
      <div className="brand-settings-grid">
        {settings &&
          Object.entries(LABELS).map(([key, label]) => (
            <label key={key}>
              <strong>{label}</strong>
              <img
                src={
                  settings[key]
                    ? `/api/media/${settings[key]}`
                    : key === "crm_logo_id"
                      ? "/brand/reloo-logo.png"
                      : "/brand/reloo-symbol.png"
                }
                alt={label}
              />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => upload(key, e.target.files[0])}
              />
            </label>
          ))}
      </div>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
