"use client";
import { useEffect, useState } from "react";
import { Landmark, Plus } from "lucide-react";
export function VirtualAccounts() {
  const [data, setData] = useState([]),
    [error, setError] = useState(""),
    [form, setForm] = useState({ profileId: "", orderId: "", amount: "" }),
    [busy, setBusy] = useState(false);
  async function load() {
    const response = await fetch("/api/crm/virtual-accounts"),
      result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result.accounts);
  }
  useEffect(() => {
    const timer = setTimeout(
      () => load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/crm/virtual-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="profile-section-heading">
        <h2>Liên kết tài khoản ảo</h2>
        <Landmark size={22} />
      </div>
      <p className="profile-note">
        VA được cấp bởi ngân hàng qua SePay cho đơn hàng thực. Tiền vào tài
        khoản chính; trạng thái này chưa xác nhận dịch vụ giữ ký quỹ.
      </p>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      <form className="rental-proposal" onSubmit={create}>
        <div className="ops-form-grid">
          {[
            ["profileId", "ID khách hàng đã xác minh"],
            ["orderId", "UUID đơn hàng SePay"],
            ["amount", "Số tiền VA (VND)"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                className="input"
                required
                maxLength={100}
                value={form[key]}
                onChange={(event) =>
                  setForm({
                    ...form,
                    [key]:
                      key === "amount"
                        ? event.target.value.replace(/\D/g, "")
                        : event.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>
        <button className="btn btn-primary" disabled={busy}>
          <Plus size={17} />
          Cấp VA & lưu liên kết
        </button>
      </form>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>VA</th>
              <th>Số tiền</th>
              <th>Hết hạn</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.profile_id}</td>
                <td>{item.masked_va}</td>
                <td>
                  {new Intl.NumberFormat("vi-VN").format(
                    BigInt(item.expected_amount),
                  )}{" "}
                  đ
                </td>
                <td>{new Date(item.expires_at).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
