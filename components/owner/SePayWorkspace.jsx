"use client";
import { useEffect, useState } from "react";
export function SePayWorkspace({ customers = [] }) {
  const [data, setData] = useState(null),
    [bank, setBank] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      profileId: "",
      amount: "",
      orderCode: "",
      duration: 86400,
      tid: "",
      vaPrefix: "",
      holderName: "",
      vaId: "",
    });
  async function load(id = bank) {
    const r = await fetch("/api/crm/sepay" + (id ? "?bank=" + id : "")).then(
      (r) => r.json(),
    );
    if (!r.ok) throw new Error(r.error);
    setData(r);
  }
  useEffect(() => {
    const timer = setTimeout(
      () => load("").catch((e) => setError(e.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  const selected = data?.banks.find((r) => r.id === bank),
    rules = selected?.requirements;
  async function act(action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/crm/sepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, bankId: bank, action }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      setNotice(
        "Đã ghi nhận " +
          (action === "CONFIGURE" ? "tài khoản thu tiền" : "liên kết VA") +
          ".",
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-editor">
      <h2>SePay · tài khoản định danh & dòng tiền</h2>
      <button
        className="btn btn-secondary"
        onClick={async () => {
          try {
            const r = await fetch("/api/crm/sepay/sync", {
              method: "POST",
            }).then((r) => r.json());
            if (!r.ok) throw new Error(r.error);
            setNotice("Đã xếp hàng đồng bộ giao dịch từ SePay.");
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        Đồng bộ dòng tiền
      </button>
      <p>
        VA nhận tiền về tài khoản ngân hàng cha và giúp khớp từng khách hàng
        hoặc đơn thu. Cấu hình này là thu tiền có đối soát; không tự tạo dịch vụ
        giữ ký quỹ.
      </p>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <label>
        Tài khoản ngân hàng SePay
        <select
          className="input"
          value={bank}
          onChange={(e) => {
            setBank(e.target.value);
            load(e.target.value).catch((e) => setError(e.message));
          }}
        >
          <option value="">Chọn tài khoản ngân hàng đã liên kết</option>
          {data?.banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bank} {b.maskedAccount} ·{" "}
              {b.vaSupported ? "Hỗ trợ VA" : "Chưa hỗ trợ cấp VA"} ·{" "}
              {b.accountType === "enterprise" ? "Doanh nghiệp" : "Cá nhân"}
            </option>
          ))}
        </select>
      </label>
      {data && !data.banks.some((b) => b.vaSupported) && (
        <div className="kyc-status-card">
          <h3>Cần liên kết Vietcombank hoặc VietinBank</h3>
          <p>
            Hiện có {data.banks.length} tài khoản MBBank cá nhân. Liên kết tài
            khoản hỗ trợ trong SePay rồi tải lại màn hình này.
          </p>
          <a
            href="https://my.sepay.vn/bankaccounts"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Mở tài khoản ngân hàng SePay
          </a>
        </div>
      )}
      {selected && rules && (
        <>
          <div className="kyc-status-card">
            <h3>Điều kiện {selected.bank}</h3>
            {rules.tid && (
              <p>
                Cần Terminal ID gốc đã được Vietcombank cấp và thuộc tài khoản
                này.
              </p>
            )}
            {rules.collectionService && (
              <p>
                Cần SePay/ngân hàng bật dịch vụ thu hộ qua tài khoản định danh
                VietinBank.
              </p>
            )}
            {rules.enterprise && (
              <p>Cần tài khoản doanh nghiệp đã được kích hoạt trên SePay.</p>
            )}
            {rules.vaPrefix && (
              <p>Cần tiền tố VA và merchant Sacombank đang hoạt động.</p>
            )}
            <p>
              {rules.amountRequired
                ? "Số tiền thu là bắt buộc."
                : "BIDV hỗ trợ đơn mở; RELOO yêu cầu số tiền thu rõ ràng."}
            </p>
          </div>
          <div className="ops-form-grid">
            {rules.tid && (
              <label>
                Terminal ID Vietcombank
                <input
                  className="input"
                  value={form.tid}
                  onChange={(e) => setForm({ ...form, tid: e.target.value })}
                />
              </label>
            )}
            {rules.vaPrefix && (
              <label>
                Tiền tố VA Sacombank
                <input
                  className="input"
                  value={form.vaPrefix}
                  onChange={(e) =>
                    setForm({ ...form, vaPrefix: e.target.value })
                  }
                />
              </label>
            )}
          </div>
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => act("CONFIGURE")}
          >
            Lưu tài khoản thu tiền
          </button>
          <h3>Cấp VA cho khoản thu mới</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act("CREATE");
            }}
          >
            <div className="ops-form-grid">
              <label>
                Khách hàng
                <select
                  className="input"
                  required
                  value={form.profileId}
                  onChange={(e) =>
                    setForm({ ...form, profileId: e.target.value })
                  }
                >
                  <option value="">Chọn khách hàng</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mã khoản thu (duy nhất)
                <input
                  className="input"
                  required
                  value={form.orderCode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      orderCode: e.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label>
                Số tiền VND
                <input
                  className="input"
                  required
                  type="number"
                  min={1}
                  step={1}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
              <label>
                Thời hạn VA (giây)
                <input
                  className="input"
                  type="number"
                  min={60}
                  max={2592000}
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                />
              </label>
              {rules.holder && (
                <label>
                  Tên chủ VA (nếu ngân hàng cho phép)
                  <input
                    className="input"
                    value={form.holderName}
                    onChange={(e) =>
                      setForm({ ...form, holderName: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
            <p className="profile-note">
              VA mới cần pháp nhân thu tiền đã khai báo và khách hàng được duyệt
              CCCD còn hiệu lực. Nếu API trả lỗi hoặc mất kết nối, đối chiếu mã
              khoản thu tại SePay trước khi tạo lại.
            </p>
            <button className="btn btn-primary" disabled={busy}>
              Cấp VA qua SePay
            </button>
          </form>
          <h3>VA hiện có trong SePay</h3>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>VA</th>
                  <th>Nhãn / chủ VA</th>
                  <th>Hoạt động</th>
                  <th>Loại</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.va}</td>
                    <td>{a.label || a.sub_holder_name}</td>
                    <td>{String(a.active) === "1" ? "Có" : "Không"}</td>
                    <td>
                      {String(a.static) === "1" ? "Tĩnh" : "Theo khoản thu"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act("LINK");
            }}
          >
            <div className="ops-form-grid">
              <label>
                Khách hàng nhận liên kết
                <select
                  className="input"
                  required
                  value={form.profileId}
                  onChange={(e) =>
                    setForm({ ...form, profileId: e.target.value })
                  }
                >
                  <option value="">Chọn khách hàng</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chọn VA hiện có
                <select
                  className="input"
                  required
                  value={form.vaId}
                  onChange={(e) => setForm({ ...form, vaId: e.target.value })}
                >
                  <option value="">Chọn VA</option>
                  {data.accounts
                    .filter((a) => String(a.active) === "1")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.va} · {a.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <button className="btn btn-secondary" disabled={busy}>
              Liên kết VA đã có với khách hàng
            </button>
          </form>
        </>
      )}
    </section>
  );
}
