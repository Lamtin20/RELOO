"use client";
import { useEffect, useState } from "react";
const EMPTY = {
  name: "",
  ownerId: "",
  description: "",
  image: "",
  status: "DRAFT",
  assets: [],
};
export function LocalBrandManager() {
  const [brands, setBrands] = useState([]),
    [draft, setDraft] = useState(EMPTY),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  async function load() {
    const r = await fetch("/api/crm/local-brands"),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setBrands(d.brands);
    setLoaded(true);
  }
  useEffect(() => {
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(timer);
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/crm/local-brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setDraft(EMPTY);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-panel">
      <h2>Local Brand · đối tác riêng</h2>
      <p>
        Gắn thương hiệu với tài khoản shop và các ID sản phẩm bán thuộc chính
        shop. Hồ sơ ACTIVE mới xuất hiện công khai; nhãn không thay thế xác thực
        pháp lý.
      </p>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      <form onSubmit={save} className="market-brand-form">
        {[
          ["name", "Tên thương hiệu"],
          ["ownerId", "ID tài khoản shop"],
          ["description", "Giới thiệu"],
          ["image", "Ảnh /api/media/… hoặc /images/…"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={draft[key]}
              required={["name", "ownerId"].includes(key)}
              maxLength={key === "description" ? 600 : 200}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        <label>
          ID sản phẩm bán, cách nhau bằng dấu phẩy
          <textarea
            value={draft.assets.join(",")}
            onChange={(e) =>
              setDraft({
                ...draft,
                assets: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label>
          Trạng thái
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          >
            <option value="DRAFT">Bản nháp</option>
            <option value="ACTIVE">Công bố</option>
            <option value="PAUSED">Tạm dừng</option>
          </select>
        </label>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thương hiệu"}
        </button>
        {draft.id && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setDraft(EMPTY)}
          >
            Tạo mới
          </button>
        )}
      </form>
      {!loaded && !error && <p role="status">Đang tải đối tác…</p>}
      <div className="market-brand-admin-list">
        {brands.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() =>
              setDraft({
                id: b.id,
                version: b.version,
                name: b.name,
                ownerId: b.owner_id,
                description: b.description,
                image: b.image_url,
                status: b.status,
                assets: b.local_brand_products.map((p) => p.asset_id),
              })
            }
          >
            {b.name} · {b.status} · {b.local_brand_products.length} sản phẩm
          </button>
        ))}
      </div>
    </section>
  );
}
