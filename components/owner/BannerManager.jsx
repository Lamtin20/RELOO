"use client";
import { useEffect, useState } from "react";
import { BANNER_SLOTS } from "@/lib/content/banner-slots";
import { localDateTime, fromLocalDateTime } from "@/lib/content/date-time";
const empty = {
  title: "",
  placement: "home_top",
  desktop_id: "",
  mobile_id: "",
  alt: "",
  href: "/explore",
  priority: 0,
  status: "DRAFT",
  starts_at: "",
  ends_at: "",
};
export function BannerManager() {
  const [rows, setRows] = useState([]),
    [item, setItem] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/crm/banners").then((r) => r.json());
    if (!r.ok) throw new Error(r.error);
    setRows(r.banners);
  }
  useEffect(() => {
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(timer);
  }, []);
  const field = (key, value) =>
    setItem((current) => ({ ...current, [key]: value }));
  async function upload(key, file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("purpose", "banner");
      const r = await fetch("/api/crm/media", {
        method: "POST",
        body: form,
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      field(key, r.asset.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/crm/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      setItem(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="ops-toolbar">
        <p>Banner hiển thị theo vị trí, thời gian và thiết bị</p>
        <button
          className="btn btn-primary"
          onClick={() => setItem({ ...empty })}
        >
          Thêm banner / POSM
        </button>
      </div>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Vị trí</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{BANNER_SLOTS[row.placement]?.label}</td>
                <td>
                  {
                    {
                      DRAFT: "Bản nháp",
                      PUBLISHED: "Đang treo",
                      ARCHIVED: "Lưu trữ",
                    }[row.status]
                  }
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setItem({ ...row })}
                  >
                    Chỉnh sửa
                  </button>
                  {row.placement === "posm" && (
                    <a
                      href={`/api/media/${row.desktop_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở POSM
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="ops-empty">Chưa có banner được khai báo.</p>
        )}
      </div>
      {item && (
        <form className="ops-editor" onSubmit={save}>
          <h2>Khai báo banner / POSM</h2>
          <div className="ops-form-grid">
            <label>
              Tên chương trình
              <input
                className="input"
                required
                value={item.title}
                onChange={(e) => field("title", e.target.value)}
              />
            </label>
            <label>
              Vị trí
              <select
                className="input"
                value={item.placement}
                onChange={(e) =>
                  setItem({
                    ...item,
                    placement: e.target.value,
                    desktop_id: "",
                    mobile_id: "",
                  })
                }
              >
                {Object.entries(BANNER_SLOTS).map(([key, slot]) => (
                  <option key={key} value={key}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
            {[
              ["desktop_id", "desktop", "Ảnh desktop"],
              ["mobile_id", "mobile", "Ảnh mobile"],
            ].map(([key, type, label]) => (
              <label key={key}>
                {label} · {BANNER_SLOTS[item.placement][type].join("×")} px
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => upload(key, e.target.files[0])}
                />
                {item[key] && (
                  <img
                    className="content-cover-preview"
                    src={`/api/media/${item[key]}`}
                    alt={label}
                  />
                )}
              </label>
            ))}
            <label>
              Mô tả banner
              <input
                className="input"
                required
                value={item.alt}
                onChange={(e) => field("alt", e.target.value)}
              />
            </label>
            <label>
              Liên kết khi bấm
              <input
                className="input"
                required
                value={item.href}
                onChange={(e) => field("href", e.target.value)}
              />
            </label>
            <label>
              Bắt đầu
              <input
                className="input"
                type="datetime-local"
                value={localDateTime(item.starts_at)}
                onChange={(e) =>
                  field("starts_at", fromLocalDateTime(e.target.value))
                }
              />
            </label>
            <label>
              Kết thúc
              <input
                className="input"
                type="datetime-local"
                value={localDateTime(item.ends_at)}
                onChange={(e) =>
                  field("ends_at", fromLocalDateTime(e.target.value))
                }
              />
            </label>
            <label>
              Ưu tiên (0–100)
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={item.priority}
                onChange={(e) => field("priority", e.target.value)}
              />
            </label>
            <label>
              Trạng thái
              <select
                className="input"
                value={item.status}
                onChange={(e) => field("status", e.target.value)}
              >
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Hiển thị</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </label>
          </div>
          <p className="profile-note">
            Giữ đúng tỷ lệ ảnh, không đặt chữ sát mép. Ảnh được hiển thị đầy đủ
            và dùng phiên bản riêng cho mobile. POSM chỉ lưu trong CRM.
          </p>
          <div className="ops-actions">
            <button className="btn btn-primary" disabled={busy}>
              Lưu banner
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setItem(null)}
            >
              Đóng
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
