"use client";
import { useEffect, useState } from "react";
import {
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
const STATES = {
  OPEN: "Mới tiếp nhận",
  VERIFYING: "Đang xác minh",
  APPEALED: "Có khiếu nại",
  RESTRICTED: "Đang hạn chế",
  CLEARED: "Đã gỡ hạn chế",
};
export default function RiskPage() {
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("VERIFY");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [hours, setHours] = useState(720);
  const [signal, setSignal] = useState({
    phone: "",
    source: "verified_review",
    evidenceUrl: "",
    note: "",
    expiresAt: "",
  });
  const [ipScope, setIpScope] = useState("chat_write");
  const [ipHours, setIpHours] = useState(1);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/security/admin/cases")
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled) {
          if (result.ok) setData(result);
          else setError(result.error);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Chưa tải được hồ sơ rủi ro.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await fetch("/api/security/admin/cases").then((res) =>
        res.json(),
      );
      if (!result.ok) throw new Error(result.error);
      setData(result);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  const selected =
    data?.cases?.find((item) => item.id === selectedId) || data?.cases?.[0];
  async function command(path, payload) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccess("Đã lưu quyết định và nhật ký kiểm toán.");
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  function review(event) {
    event.preventDefault();
    command("/api/security/admin/cases", {
      caseId: selected.id,
      action,
      reason,
      validHours: Number(hours),
      evidence: evidenceUrl
        ? [{ url: evidenceUrl, note: evidenceNote, source: "admin_review" }]
        : [],
    });
  }
  function addSignal(event) {
    event.preventDefault();
    command("/api/security/admin/signals", {
      ...signal,
      expiresAt: new Date(signal.expiresAt).toISOString(),
    });
  }
  return (
    <div className="dashboard-page">
      <div className="feature-heading">
        <span className="feature-icon feature-icon--blue">
          <ShieldAlert size={24} />
        </span>
        <div>
          <h1>Rủi ro & xác minh tài khoản</h1>
          <p>
            Quyết định dựa trên bằng chứng, có khiếu nại và nhật ký đối chiếu.
          </p>
        </div>
        <button
          type="button"
          className="icon-tool"
          onClick={load}
          title="Tải lại hồ sơ"
          aria-label="Tải lại hồ sơ"
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle size={20} className="spin" />
          ) : (
            <RefreshCw size={20} />
          )}
        </button>
      </div>
      {error && (
        <p className="feature-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="feature-success" role="status">
          {success}
        </p>
      )}
      {data && (
        <>
          <div className="risk-workspace">
            <aside className="risk-list">
              <h2>Hồ sơ ({data.cases.length})</h2>
              {!data.cases.length && (
                <p className="feature-footnote">Chưa có hồ sơ xác minh.</p>
              )}
              {data.cases.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={selected?.id === item.id ? "is-active" : ""}
                  onClick={() => {
                    setSelectedId(item.id);
                    setReason("");
                    setEvidenceUrl("");
                    setEvidenceNote("");
                  }}
                >
                  <strong>{item.profiles?.name || "Tài khoản"}</strong>
                  <span>
                    {STATES[item.status]} · {item.reason}
                  </span>
                  <span>{item.id.slice(0, 8)}</span>
                </button>
              ))}
            </aside>
            <section className="risk-review">
              {selected ? (
                <>
                  <span className="r-eyebrow">
                    HỒ SƠ {selected.id.slice(0, 8)}
                  </span>
                  <h2>{selected.profiles?.name || "Tài khoản"}</h2>
                  <div className="risk-detail-row">
                    <span>Trạng thái</span>
                    <strong>{STATES[selected.status]}</strong>
                  </div>
                  <div className="risk-detail-row">
                    <span>Số điện thoại</span>
                    <strong>•••• {selected.profiles?.phone?.slice(-4)}</strong>
                  </div>
                  <div className="risk-detail-row">
                    <span>Kết quả kiểm tra</span>
                    <strong>
                      {selected.phone_screening_checks?.result ||
                        selected.reason}
                    </strong>
                  </div>
                  {selected.phone_screening_checks?.source_results?.map(
                    (source, index) => (
                      <p className="feature-footnote" key={index}>
                        {source.source}: {source.status}.{" "}
                        {source.reason || "Bằng chứng đã được đối chiếu."}
                      </p>
                    ),
                  )}
                  <h3 style={{ marginTop: 24 }}>Bằng chứng & khiếu nại</h3>
                  {data.evidence
                    .filter((item) => item.case_id === selected.id)
                    .map((item) => (
                      <p className="feature-footnote" key={item.id}>
                        <a
                          href={item.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.source}
                        </a>{" "}
                        · {item.note}
                      </p>
                    ))}
                  {data.appeals
                    .filter((item) => item.case_id === selected.id)
                    .map((item) => (
                      <div
                        className="safety-status"
                        key={item.id}
                        style={{ marginTop: 12 }}
                      >
                        <FileCheck2 size={20} />
                        <div>
                          <strong>Yêu cầu đối chiếu</strong>
                          <p>{item.explanation}</p>
                          {item.evidence.map((url, index) => (
                            <p key={index}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Bằng chứng {index + 1}
                              </a>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  {selected.status !== "CLEARED" && (
                    <form onSubmit={review}>
                      <label>
                        Quyết định
                        <select
                          value={action}
                          onChange={(event) => setAction(event.target.value)}
                        >
                          <option value="VERIFY">Chuyển xác minh</option>
                          <option value="RESTRICT">Giữ hạn chế</option>
                          <option value="CLEAR">
                            Gỡ hạn chế sau đối chiếu
                          </option>
                        </select>
                      </label>
                      <label>
                        Lý do quyết định
                        <textarea
                          required
                          minLength={20}
                          maxLength={4000}
                          rows={3}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                        />
                      </label>
                      <label>
                        Liên kết bằng chứng
                        <input
                          type="url"
                          required={action === "CLEAR"}
                          value={evidenceUrl}
                          onChange={(event) =>
                            setEvidenceUrl(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Ghi chú đối chiếu bằng chứng
                        <textarea
                          required={Boolean(evidenceUrl)}
                          minLength={10}
                          rows={3}
                          value={evidenceNote}
                          onChange={(event) =>
                            setEvidenceNote(event.target.value)
                          }
                        />
                      </label>
                      {action === "CLEAR" && (
                        <label>
                          Hiệu lực xác minh (giờ, tối đa 720)
                          <input
                            type="number"
                            min={1}
                            max={720}
                            required
                            value={hours}
                            onChange={(event) => setHours(event.target.value)}
                          />
                        </label>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={busy}
                      >
                        <ShieldCheck size={17} />
                        Lưu quyết định
                      </button>
                    </form>
                  )}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      command("/api/security/admin/ip-signals", {
                        checkId: selected.check_id,
                        scope: ipScope,
                        hours: Number(ipHours),
                        reason,
                      });
                    }}
                  >
                    <h3>Hạn chế IP có phạm vi</h3>
                    <p className="feature-footnote">
                      Chỉ áp dụng IP ghi nhận trong lần kiểm tra của tài khoản
                      này. Không áp dụng cho các tài khoản dùng chung mạng.
                    </p>
                    <label>
                      Nghiệp vụ
                      <select
                        value={ipScope}
                        onChange={(event) => setIpScope(event.target.value)}
                      >
                        <option value="chat_write">Gửi tin nhắn</option>
                        <option value="listing_write">Đăng / sửa tin</option>
                        <option value="inquiry_write">Gửi yêu cầu thuê</option>
                        <option value="cashback">Tạo link hoàn tiền</option>
                      </select>
                    </label>
                    <label>
                      Thời hạn (1–24 giờ)
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={ipHours}
                        onChange={(event) => setIpHours(event.target.value)}
                      />
                    </label>
                    <label>
                      Lý do có căn cứ
                      <textarea
                        required
                        minLength={20}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={busy}
                    >
                      Lưu hạn chế có thời hạn
                    </button>
                  </form>
                </>
              ) : (
                <div className="feature-empty">
                  <ShieldCheck size={32} />
                  <h3>Chọn hồ sơ để đối chiếu</h3>
                </div>
              )}
            </section>
          </div>
          <section
            className="risk-review"
            style={{
              marginTop: 35,
              borderTop: "1px solid #e1e8e3",
              paddingTop: 25,
            }}
          >
            <h2>Ghi nhận cảnh báo đã đối chiếu</h2>
            <p className="feature-footnote">
              Thông tin nhập thủ công được ghi là bằng chứng quản trị, không
              thay thế kết nối API nguồn bên ngoài. Tài khoản có số điện thoại
              khớp sẽ được hạn chế và mở hồ sơ.
            </p>
            <form onSubmit={addSignal}>
              <label>
                Số điện thoại
                <input
                  required
                  type="tel"
                  value={signal.phone}
                  onChange={(event) =>
                    setSignal({ ...signal, phone: event.target.value })
                  }
                />
              </label>
              <label>
                Nguồn bằng chứng
                <select
                  value={signal.source}
                  onChange={(event) =>
                    setSignal({ ...signal, source: event.target.value })
                  }
                >
                  <option value="verified_review">Xác minh quản trị</option>
                  <option value="checkscam">
                    Báo cáo CheckScam được đối chiếu
                  </option>
                  <option value="chongluadao">
                    Báo cáo Chống Lừa Đảo được đối chiếu
                  </option>
                  <option value="user_report">Phản ánh có bằng chứng</option>
                </select>
              </label>
              <label>
                Liên kết HTTPS
                <input
                  required
                  type="url"
                  value={signal.evidenceUrl}
                  onChange={(event) =>
                    setSignal({ ...signal, evidenceUrl: event.target.value })
                  }
                />
              </label>
              <label>
                Ghi chú kiểm chứng
                <textarea
                  required
                  minLength={20}
                  value={signal.note}
                  onChange={(event) =>
                    setSignal({ ...signal, note: event.target.value })
                  }
                />
              </label>
              <label>
                Hết hiệu lực (tối đa 30 ngày)
                <input
                  required
                  type="datetime-local"
                  value={signal.expiresAt}
                  onChange={(event) =>
                    setSignal({ ...signal, expiresAt: event.target.value })
                  }
                />
              </label>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={busy}
              >
                <ShieldAlert size={17} />
                Ghi nhận cảnh báo
              </button>
            </form>
          </section>
          <section className="risk-audit">
            <h2>Nhật ký kiểm toán</h2>
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Chủ thể</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.created_at).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </td>
                    <td>{item.action}</td>
                    <td>{item.subject_id?.slice(0, 8)}</td>
                    <td>
                      <code>{JSON.stringify(item.details)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
