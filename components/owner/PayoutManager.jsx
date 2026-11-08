"use client";
import { useEffect, useState } from "react";
import {
  formatMoney,
  SOURCE_LABELS,
  STATUS_LABELS,
  walletDate,
} from "@/lib/finance/wallet-display";
export function PayoutManager() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [destination, setDestination] = useState(null),
    [form, setForm] = useState({
      fundingEntryId: "",
      source: "RENTAL",
      amount: "",
      reason: "",
    }),
    [review, setReview] = useState({
      id: "",
      action: "APPROVE",
      reason: "",
      evidenceId: "",
      beneficiaryChecked: false,
    });
  async function load() {
    const r = await fetch("/api/crm/payouts"),
      d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  useEffect(() => {
    const timer = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(timer);
  }, []);
  async function save(input) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/crm/payouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.destination) setDestination(d.destination);
      else {
        setDestination(null);
        await load();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-editor">
      <h2>Yêu cầu rút tiền & chi trả</h2>
      <p>
        Phê duyệt khoản được chi trả từ nguồn ngân hàng đã đối soát. Chuyển tiền
        được thực hiện tại ngân hàng; ghi nhận hoàn tất cần bằng chứng giao dịch
        chi khớp.
      </p>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      {data && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fund = data.funding.find(
                (f) => f.id === form.fundingEntryId,
              );
              if (fund)
                save({
                  source: form.source,
                  amount: form.amount,
                  reason: form.reason,
                  fundingId: fund.source_id,
                  action: "RELEASE",
                  profileId: fund.profile_id,
                });
            }}
            className="integration-editor"
          >
            <h3>Phê duyệt khoản được phép chi trả</h3>
            <div className="ops-form-grid">
              <label>
                Nguồn ngân hàng
                <select
                  className="input"
                  required
                  value={form.fundingEntryId}
                  onChange={(e) =>
                    setForm({ ...form, fundingEntryId: e.target.value })
                  }
                >
                  <option value="">Chọn giao dịch đã đối soát</option>
                  {data.funding.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.profiles?.name} · {f.reference} ·{" "}
                      {formatMoney(f.amount)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Phân loại khoản chi trả
                <select
                  className="input"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                >
                  {["BANK", "RENTAL", "DEPOSIT", "REFUND", "SHOPEE", "TIKTOK"].map((code) => (
                    <option key={code} value={code}>
                      {SOURCE_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Số tiền (VND)
                <input
                  className="input"
                  required
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
              <label>
                Căn cứ đối soát
                <textarea
                  className="input"
                  required
                  minLength={20}
                  maxLength={2000}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </label>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy || !data.funding.length}
            >
              Phê duyệt khoản chi trả
            </button>
          </form>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Khách hàng / mã</th>
                  <th>Nguồn / số tiền</th>
                  <th>Ngân hàng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.profiles?.name}
                      <small>
                        {r.reference}
                        <br />
                        {walletDate(r.created_at)}
                      </small>
                    </td>
                    <td>
                      {SOURCE_LABELS[r.source_code]}
                      <br />
                      {formatMoney(r.amount)}
                    </td>
                    <td>
                      {r.bank_name}
                      <br />
                      {r.masked_account}
                    </td>
                    <td>
                      {r.status === "APPROVED"
                        ? "Đã duyệt"
                        : STATUS_LABELS[r.status]}
                    </td>
                    <td>
                      {["REQUESTED", "APPROVED", "PROCESSING"].includes(
                        r.status,
                      ) && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setDestination(null);
                            setReview({
                              id: r.id,
                              action:
                                r.status === "REQUESTED"
                                  ? "APPROVE"
                                  : r.status === "APPROVED"
                                    ? "PROCESS"
                                    : "CONFIRM_PAID",
                              reason: "",
                              evidenceId: "",
                              beneficiaryChecked: false,
                            });
                          }}
                        >
                          Xử lý
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.requests.length && (
            <p className="ops-empty">Chưa có yêu cầu rút tiền.</p>
          )}
          {review.id && (
            <form
              className="integration-editor"
              onSubmit={(e) => {
                e.preventDefault();
                save(review);
              }}
            >
              <h3>
                Xử lý yêu cầu{" "}
                {data.requests.find((r) => r.id === review.id)?.reference}
              </h3>
              <div className="ops-form-grid">
                <label>
                  Thao tác
                  <select
                    className="input"
                    value={review.action}
                    onChange={(e) =>
                      setReview({ ...review, action: e.target.value })
                    }
                  >
                    {data.requests.find((r) => r.id === review.id)?.status ===
                    "REQUESTED" ? (
                      <>
                        <option value="APPROVE">Duyệt yêu cầu</option>
                        <option value="REJECT">Từ chối</option>
                      </>
                    ) : data.requests.find((r) => r.id === review.id)
                        ?.status === "APPROVED" ? (
                      <>
                        <option value="PROCESS">
                          Ghi nhận đang chuyển tiền
                        </option>
                        <option value="REJECT">Từ chối</option>
                      </>
                    ) : (
                      <option value="CONFIRM_PAID">
                        Đối soát đã chuyển tiền
                      </option>
                    )}
                  </select>
                </label>
                <label>
                  Lý do / chứng từ
                  <textarea
                    className="input"
                    required
                    minLength={20}
                    maxLength={2000}
                    value={review.reason}
                    onChange={(e) =>
                      setReview({ ...review, reason: e.target.value })
                    }
                  />
                </label>
                {review.action === "CONFIRM_PAID" && (
                  <>
                    <label>
                      Mã nguồn giao dịch chi đã đối soát
                      <input
                        className="input"
                        required
                        value={review.evidenceId}
                        onChange={(e) =>
                          setReview({ ...review, evidenceId: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        required
                        checked={review.beneficiaryChecked}
                        onChange={(e) =>
                          setReview({
                            ...review,
                            beneficiaryChecked: e.target.checked,
                          })
                        }
                      />{" "}
                      Đã đối chiếu chứng từ và tài khoản nhận tiền.
                    </label>
                  </>
                )}
              </div>
              <div className="profile-actions">
                <button className="btn btn-primary" disabled={busy}>
                  Ghi nhận xử lý
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={busy || review.reason.trim().length < 20}
                  onClick={() =>
                    save({
                      id: review.id,
                      action: "DESTINATION",
                      reason: review.reason,
                    })
                  }
                >
                  Xem tài khoản nhận để chi trả
                </button>
              </div>
              {destination && (
                <p className="profile-note">
                  {destination.bank} · {destination.account} ·{" "}
                  {destination.holder}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </section>
  );
}
