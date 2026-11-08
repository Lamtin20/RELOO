"use client";
import { useEffect, useState } from "react";
import { CashflowSources } from "@/components/owner/CashflowSources";
import { PayoutManager } from "@/components/owner/PayoutManager";
import Papa from "papaparse";
import {
  Download,
  FilePlus2,
  RefreshCw,
  Save,
  ShieldAlert,
} from "lucide-react";
const money = (value) =>
  new Intl.NumberFormat("vi-VN").format(BigInt(value || 0)) + " đ";
const STATUS = {
  QUEUED: "Chờ đối soát",
  VERIFIED: "Đã đối chiếu ngân hàng",
  REVIEW: "Cần kiểm tra",
  DRAFT: "Dự thảo",
  CREATING: "Đang tạo",
  CREATED: "Đã tạo nháp",
  ISSUING: "Đang phát hành",
  ISSUED: "Đã xác nhận phát hành",
  UNKNOWN: "Chưa xác định",
  FAILED: "Cần xử lý lỗi",
  VOID: "Đã hủy bản nháp",
};
export function FinanceWorkspace({customers = []}) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState("journal"),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [discountNotice, setDiscountNotice] = useState(""),
    [form, setForm] = useState({
      name: "",
      address: "",
      item: "",
      unitPrice: "",
      quantity: 1,
      taxRate: 10,
      couponCode: "",
      buyerProfileId: "",
      serviceCode: "RELOO_FEE",
    });
  async function load() {
    const response = await fetch("/api/crm/finance"),
      result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }
  useEffect(() => {
    const timer = setTimeout(
      () => load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  async function draft(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/crm/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "DRAFT_INVOICE",
            buyer: { name: form.name, address: form.address },
            couponCode: form.couponCode,
            buyerProfileId: form.buyerProfileId,
            serviceCode: form.serviceCode,
            items: [
              {
                name: form.item,
                unitPrice: form.unitPrice,
                quantity: Number(form.quantity),
                taxRate: Number(form.taxRate),
                discount: "0",
              },
            ],
          }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.promotion)
        setDiscountNotice(
          "Đã áp dụng " +
            result.promotion.code +
            " · Giảm " +
            money(result.promotion.discount) +
            " trước thuế.",
        );
      setOpen(false);
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  function exportJournal() {
    const rows = [
        ["Bút toán", "Ngày ghi", "Tài khoản", "Bên", "Số tiền VND", "Nguồn"],
        ...data.lines.map((line) => {
          const journal = data.journals.find(
            (item) => item.id === line.journal_id,
          );
          return [
            line.journal_id,
            journal?.created_at,
            line.account_code,
            line.side === "DEBIT" ? "Nợ" : "Có",
            line.amount,
            journal?.source_id,
          ];
        }),
      ],
      csv = Papa.unparse(rows, {
        quotes: true,
        escapeFormulae: true,
        newline: "\r\n",
      }),
      url = URL.createObjectURL(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "reloo-so-doi-soat.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  function exportPromotions() {
    const rows = [["Ngày", "Chương trình", "Hạng mục", "Nguồn ngân hàng", "Khách nhận", "Tham chiếu", "Nợ", "Có", "Số tiền VND"],
      ...data.promotionJournal.map(r => [r.createdAt,r.campaignId,r.kind === "FUNDING" ? "Nguồn ngân sách" : "Bù giảm giá",r.sourceId,r.profileId,r.redemptionId,r.debit,r.credit,r.amount])];
    const url = URL.createObjectURL(new Blob(["\uFEFF", Papa.unparse(rows,{ quotes:true, escapeFormulae:true })], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a");
    link.href=url; link.download="reloo-so-khuyen-mai.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return (
    <section>
      <nav className="settings-tabs">
        {[
          ["journal", "Sổ đối soát"],
          ["inbox", "Tiếp nhận ngân hàng"],
          ["invoices", "Hóa đơn dự thảo"],
          ["sources", "Nguồn tiền khách hàng"],
          ["payouts", "Yêu cầu rút tiền"],
          ["allocations", "Phân bổ giao dịch thuê"],
          ["promotions", "Sổ khuyến mãi"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          title="Tải lại dữ liệu"
          onClick={() => load().catch((cause) => setError(cause.message))}
        >
          <RefreshCw size={17} />
        </button>
      </nav>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {discountNotice && (
        <p role="status" className="cashflow-success">
          {discountNotice}
        </p>
      )}
      {tab === "sources" && <CashflowSources />}
      {tab === "payouts" && <PayoutManager />}
      {tab === "promotions" && data && (
        <section>
          <h2>Ngân sách & chi phí khuyến mãi</h2>
          <p>Theo dõi chứng từ cấp ngân sách và khoản bù giảm giá đã xác nhận cho chủ đồ.</p>
          <button className="btn btn-secondary" type="button" disabled={!data.promotionJournal.length} onClick={exportPromotions}><Download size={17}/> Xuất sổ khuyến mãi</button>
          <div className="ops-table-wrap"><table className="ops-table">
            <thead><tr><th>Ngày</th><th>Hạng mục</th><th>Chương trình / Nguồn</th><th>Khách nhận</th><th>Nợ</th><th>Có</th><th>Số tiền</th></tr></thead>
            <tbody>{data.promotionJournal.map(r => <tr key={r.kind+r.id}>
              <td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
              <td>{r.kind === "FUNDING" ? "Cấp ngân sách" : "Bù giảm giá"}</td>
              <td>{r.campaignId}<small>{r.sourceId}</small></td>
              <td>{r.profileId || "RELOO"}</td><td>{r.debit}</td><td>{r.credit}</td><td>{money(r.amount)}</td>
            </tr>)}</tbody>
          </table></div>
          {!data.promotionJournal.length && <p>Chưa có chứng từ ngân sách hoặc khoản bù giảm giá.</p>}
          <p className="profile-note">Đây là sổ phân loại nguồn tiền và chi phí; đối chiếu cùng sổ ngân hàng và chứng từ gốc. Giảm giá dịch vụ RELOO được thể hiện trên hóa đơn.</p>
        </section>
      )}
      {tab === "allocations" && data && (
        <section>
          <h2>Đối soát QR & sổ phân bổ</h2>
          <p>
            Khoản thu ngân hàng được ghi vào sổ gốc; sổ phân bổ dưới đây chuyển
            khoản chờ đối soát sang nghĩa vụ của đúng khách hàng, không ghi tăng
            tiền ngân hàng lần nữa.
          </p>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Tham chiếu</th>
                  <th>Khách hàng</th>
                  <th>Hạng mục</th>
                  <th>Nợ</th>
                  <th>Có</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.allocations.map((a) => (
                  <tr key={a.id}>
                    <td>{a.intent_id}</td>
                    <td>{a.profile_id}</td>
                    <td>{a.kind === "DEPOSIT" ? "Tiền cọc" : "Tiền thuê"}</td>
                    <td>{a.debit_account}</td>
                    <td>{a.credit_account}</td>
                    <td>{money(a.debit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.allocations.length && <p>Chưa có khoản thu được phân bổ.</p>}
          <h3>Khoản cần kiểm tra</h3>
          {data.paymentReviews.map((p) => (
            <p key={p.id}>
              {p.reference} · {money(p.amount)} · Cần đối chiếu bằng chứng ngân
              hàng và thỏa thuận.
            </p>
          ))}
        </section>
      )}
      {data && (
        <>
          {tab === "journal" && (
            <>
              <div className="profile-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={!data.lines.length}
                  onClick={exportJournal}
                >
                  <Download size={17} />
                  Xuất sổ CSV
                </button>
              </div>
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Bút toán</th>
                      <th>Tài khoản</th>
                      <th>Nợ / Có</th>
                      <th>Số tiền</th>
                      <th>Nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => {
                      const journal = data.journals.find(
                          (item) => item.id === line.journal_id,
                        ),
                        source = data.sources.find(
                          (item) => item.id === journal?.source_id,
                        );
                      return (
                        <tr key={line.id}>
                          <td>{line.journal_id.slice(0, 8)}</td>
                          <td>{line.account_code}</td>
                          <td>{line.side === "DEBIT" ? "Nợ" : "Có"}</td>
                          <td>{money(line.amount)}</td>
                          <td>
                            {source?.integrity ? (
                              "Ngân hàng đã đối chiếu"
                            ) : (
                              <span>
                                <ShieldAlert size={15} />
                                Cần kiểm tra toàn vẹn
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="profile-note">
                Khoản thu/chi chưa phân loại được ghi ở tài khoản chờ đối chiếu.
                Số liệu là biến động đã ghi nhận, chưa phải số dư ngân hàng đầy
                đủ khi chưa có chứng từ số dư đầu kỳ.
              </p>
            </>
          )}
          {tab === "inbox" && (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Lượt tiếp nhận</th>
                    <th>Trạng thái</th>
                    <th>Ngày</th>
                    <th>Kết quả kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inbox.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id.slice(0, 8)}</td>
                      <td>{STATUS[item.status]}</td>
                      <td>
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td>{item.result_code || "Đang kiểm tra"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "invoices" && (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setOpen(!open)}
              >
                <FilePlus2 size={17} />
                Tạo bản dự thảo
              </button>
              {open && (
                <form className="integration-editor" onSubmit={draft}>
                  <div className="ops-form-grid">
                    {[
                      ["name", "Tên người mua"],
                      ["address", "Địa chỉ người mua"],
                      ["item", "Tên hàng hóa / dịch vụ"],
                      ["unitPrice", "Đơn giá VND"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          className="input"
                          required
                          maxLength={key === "address" ? 500 : 200}
                          value={form[key]}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              [key]:
                                key === "unitPrice"
                                  ? event.target.value.replace(/\D/g, "")
                                  : event.target.value,
                            })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Số lượng
                      <input
                        className="input"
                        type="number"
                        required
                        min="1"
                        max="100000"
                        step="1"
                        value={form.quantity}
                        onChange={(event) =>
                          setForm({ ...form, quantity: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Thuế suất
                      <select
                        className="input"
                        value={form.taxRate}
                        onChange={(event) =>
                          setForm({ ...form, taxRate: event.target.value })
                        }
                      >
                        {[
                          [-2, "Không chịu thuế"],
                          [-1, "Không kê khai"],
                          [0, "0%"],
                          [5, "5%"],
                          [8, "8%"],
                          [10, "10%"],
                        ].map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Mã coupon dịch vụ (tùy chọn)
                      <input
                        className="input"
                        maxLength={40}
                        value={form.couponCode}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            couponCode: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </label>
                    <label>
                      Khách hàng áp dụng coupon
                      <select
                        className="input"
                        required={!!form.couponCode}
                        value={form.buyerProfileId}
                        onChange={(e) =>
                          setForm({ ...form, buyerProfileId: e.target.value })
                        }
                      >
                        <option value="">Chọn khách hàng</option>
                        {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label>
                      Dịch vụ của RELOO
                      <select
                        className="input"
                        value={form.serviceCode}
                        onChange={(e) =>
                          setForm({ ...form, serviceCode: e.target.value })
                        }
                      >
                        <option value="RELOO_FEE">Phí dịch vụ RELOO</option>
                        <option value="LISTING_BOOST">
                          Quảng bá / đẩy tin
                        </option>
                        <option value="INSPECTION">Kiểm tra thiết bị</option>
                      </select>
                    </label>
                  </div>
                  <button className="btn btn-primary" disabled={busy}>
                    <Save size={17} />
                    Lưu bản dự thảo
                  </button>
                </form>
              )}
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Tham chiếu</th>
                      <th>Trước thuế</th>
                      <th>Thuế</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((item) => (
                      <tr key={item.id}>
                        <td>{item.reference_code.slice(0, 8)}</td>
                        <td>{money(item.subtotal)}</td>
                        <td>{money(item.tax)}</td>
                        <td>{money(item.total)}</td>
                        <td>{STATUS[item.status]}</td>
                        <td>
                          {item.status === "DRAFT" && (
                            <button
                              className="btn btn-ghost"
                              onClick={async () => {
                                const reason = window.prompt(
                                  "Nhập căn cứ hủy bản nháp chưa gửi nhà cung cấp (tối thiểu 20 ký tự):",
                                );
                                if (!reason) return;
                                setBusy(true);
                                setError("");
                                try {
                                  const r = await fetch("/api/crm/finance", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        action: "VOID_DRAFT",
                                        id: item.id,
                                        reason,
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
                              disabled={busy}
                            >
                              Hủy bản nháp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="profile-note">
                Bản dự thảo chưa gửi cơ quan thuế. Phát hành cần chủ thể hợp lệ,
                tài khoản nhà cung cấp, nguồn doanh thu của đúng người bán đã
                đối soát và người xét duyệt riêng.
              </p>
            </>
          )}
          {!data.lines.length && tab === "journal" && (
            <p className="profile-note">
              Chưa có giao dịch ngân hàng đã được đối chiếu để ghi sổ.
            </p>
          )}
        </>
      )}
    </section>
  );
}
