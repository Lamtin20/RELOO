"use client";
import { useEffect, useState } from "react";
import { Gift, Check, Ticket } from "lucide-react";
import { PROMOTION_SERVICES } from "@/lib/promotions/rules";
import { formatMoney } from "@/lib/finance/wallet-display";
export default function ProviderPromotions() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [checked, setChecked] = useState({}),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch("/api/promotions/participation"),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
  }
  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="dashboard-page">
      <header className="profile-header">
        <Gift size={28} />
        <div>
          <h1>Chương trình ưu đãi</h1>
          <p>Đọc điều kiện và xác nhận chương trình do bạn chịu phần giảm.</p>
        </div>
      </header>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      {data?.programs.length === 0 && (
        <div className="promo-empty">
          <Ticket size={38} />
          <p>Chưa có lời mời tham gia chương trình.</p>
        </div>
      )}
      {data?.programs.map((p) => {
        const c = p.promotion_campaigns;
        return (
          <article className="identity-intake" key={c.id}>
            <h2>{c.name}</h2>
            <p>{c.description}</p>
            <div className="promo-scopes">
              {c.services.map((s) => (
                <span key={s}>{PROMOTION_SERVICES[s]}</span>
              ))}
            </div>
            <p className="profile-note">
              {new Date(c.starts_at).toLocaleString("vi-VN")} —{" "}
              {new Date(c.ends_at).toLocaleString("vi-VN")}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{c.terms}</p>
            {data.coupons
              .filter((code) => code.campaign_id === c.id)
              .map((code) => (
                <p key={code.id}>
                  <strong>{code.code}</strong> · Giảm{" "}
                  {code.discount_type === "PERCENT"
                    ? Number(code.value) / 100 + "%"
                    : formatMoney(code.value)}
                  {code.max_discount &&
                    " · Tối đa " + formatMoney(code.max_discount)}
                </p>
              ))}
            <p>
              Phần giảm do bạn chịu được trừ khỏi giá thuê của đơn áp dụng
              coupon. Giá đã chốt của đơn đang xử lý được giữ nguyên khi chương
              trình thay đổi.
            </p>
            {p.status === "ACCEPTED" && p.accepted_version === c.version ? (
              <p className="cashflow-success">
                <Check size={17} />
                Bạn đã đồng ý phiên bản {c.version}
              </p>
            ) : (
              <label className="profile-check">
                <input
                  type="checkbox"
                  checked={!!checked[c.id]}
                  onChange={(e) =>
                    setChecked({ ...checked, [c.id]: e.target.checked })
                  }
                />
                Tôi đã đọc mức giảm và đồng ý chịu phần giảm theo điều kiện
                trên.
              </label>
            )}
            <div className="identity-actions">
              {!(
                p.status === "ACCEPTED" && p.accepted_version === c.version
              ) && (
                <button
                  className="btn btn-primary"
                  disabled={busy || !checked[c.id] || c.status !== "ACTIVE"}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const r = await fetch("/api/promotions/participation", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            campaignId: c.id,
                            version: c.version,
                            accept: true,
                            confirmed: true,
                          }),
                        }),
                        d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      await load();
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Xác nhận tham gia
                </button>
              )}
              <button
                className="btn btn-secondary"
                disabled={busy || c.status !== "ACTIVE"}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await fetch("/api/promotions/participation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          campaignId: c.id,
                          version: c.version,
                          accept: false,
                        }),
                      }),
                      d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    await load();
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {p.status === "ACCEPTED" ? "Ngừng tham gia đơn mới" : "Từ chối"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
