"use client";
import { useEffect, useState } from "react";
export function CashflowSources() {
  const [entries, setEntries] = useState([]),
    [selected, setSelected] = useState(""),
    [source, setSource] = useState("RENTAL"),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const data = await fetch("/api/crm/cashflow-sources").then((r) => r.json());
    if (!data.ok) throw new Error(data.error);
    setEntries(data.entries);
  }
  useEffect(() => {
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(timer);
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/crm/cashflow-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: selected, source, reason }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      setSelected("");
      setReason("");
      setError("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-editor">
      <h2>Phân loại nguồn tiền khách hàng</h2>
      <p>
        Chỉ phân loại các giao dịch ngân hàng đã đối soát. Việc phân loại giữ
        nguyên số tiền và lưu người thực hiện cùng lý do.
      </p>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {entries.length ? (
        <form onSubmit={save}>
          <div className="ops-form-grid">
            <label>
              Giao dịch
              <select
                className="input"
                required
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Chọn giao dịch</option>
                {entries.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.profiles?.name || row.profile_id} · {row.reference} ·{" "}
                    {new Intl.NumberFormat("vi-VN").format(BigInt(row.amount))}đ
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nguồn tiền
              <select
                className="input"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="RENTAL">Thu nhập cho thuê</option>
                <option value="BANK">Giao dịch ngân hàng chờ phân loại</option>
                <option value="REFUND">Tiền hoàn giao dịch thuê</option>
                <option value="DEPOSIT">Ký quỹ (cần bật chương trình)</option>
              </select>
            </label>
            <label className="full">
              Căn cứ phân loại
              <textarea
                className="input"
                required
                minLength={20}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
          <button className="btn btn-primary" disabled={busy}>
            Ghi nhận nguồn tiền
          </button>
        </form>
      ) : (
        <p className="ops-empty">
          Chưa có giao dịch ngân hàng của khách hàng để phân loại.
        </p>
      )}
    </section>
  );
}
