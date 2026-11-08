"use client";
import {rentalReturnCopy,RENTAL_RETURN_POLICY} from '@/lib/rental-return-policy';
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  FileCheck2,
  History,
  LoaderCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {useAccountCounts} from '@/components/dashboard/AccountCounts';
import {OrderScopeTabs} from '@/components/dashboard/OrderWorkspace';
import { useAuth } from "@/lib/store";
import { RentalPayment } from "@/components/cashflow/RentalPayment";
import {SmartKeyPanel} from '@/components/security/SmartKeyPanel';
const STATES = {
  PROPOSED: "Chờ bên còn lại xác nhận",
  ACCEPTED: "Đã thống nhất",
  ACTIVE: "Đang thuê",
  CLOSED: "Đã hoàn trả",
  CANCELLED: "Đã hủy",
  DISPUTED: "Đang giải quyết tranh chấp",
};
const EVENTS = {
  PROPOSED: "Đề xuất thỏa thuận",
  ACCEPTED: "Xác nhận điều kiện thuê",
  HANDOVER_CONFIRMED: "Xác nhận bàn giao",
  RETURN_CONFIRMED: "Xác nhận hoàn trả",
  CANCELLED: "Hủy đề xuất",
  DISPUTED: "Yêu cầu giải quyết tranh chấp",
};
export function RentalAgreements({ threadId, compact = false }) {
  const [orderFilter,setOrderFilter]=useState('all');
  const accountCounts=useAccountCounts();
  const { user } = useAuth();
  const attempt = useRef(null);
  const [data, setData] = useState(null),
    [open, setOpen] = useState(false),
    [form, setForm] = useState({
      startsAt: "",
      endsAt: "",
      rentAmount: "",
      terms: "",
      agreed: false,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),[smart,setSmart]=useState(false);
  const load = useCallback(async () => {
    const response = await fetch(
        "/api/rental/agreements" +
          (threadId ? "?" + new URLSearchParams({ thread: threadId }) : ""),
      ),
      result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }, [threadId]);
  useEffect(() => {
    const timer = setTimeout(
      () => load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [load]);
  async function mutate(input) {
    setBusy(true);
    setError("");
    const fingerprint = JSON.stringify(input);
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const response = await fetch("/api/rental/agreements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, requestId: attempt.current.id }),
        }),
        result = await response.json();
      if (!response.ok) {if(result.code==='SMART_KEY_REQUIRED')setSmart(true);throw new Error(result.error);}
      attempt.current = null;
      setOpen(false);
      await load();window.dispatchEvent(new Event("reloo-account-changed"));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`rental-agreements ${compact ? "rental-agreements--compact" : ""}`}
    >
      <div className="profile-section-heading">
        <h2>
          <FileCheck2 size={21} />
          Thỏa thuận thuê
        </h2>
        {threadId && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !data?.termsReady}
            onClick={() => setOpen(!open)}
          >
            <Plus size={17} />
            Tạo thỏa thuận
          </button>
        )}
      </div>
      {!data?.termsReady && data && (
        <p className="profile-note">
          Thỏa thuận mẫu đang chờ ban hành. Hai bên có thể tiếp tục xác nhận
          thông tin qua cuộc trao đổi.
        </p>
      )}
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {smart&&<SmartKeyPanel onVerified={()=>{setSmart(false);setError('Smart Key đã xác thực. Xác nhận lại thao tác để tiếp tục.');}}/>}
      {!data && !error && (
        <p>
          <LoaderCircle size={18} className="spin" /> Đang tải...
        </p>
      )}
      {open && (
        <form
          className="rental-proposal"
          onSubmit={(event) => {
            event.preventDefault();
            mutate({
              action: "PROPOSED",
              returnPolicyVersion:RENTAL_RETURN_POLICY.version,
              threadId,
              ...form,
              startsAt: form.startsAt + ":00+07:00",
              endsAt: form.endsAt + ":00+07:00",
            });
          }}
        >
          <div className="profile-grid">
            <label>
              Nhận đồ (giờ Việt Nam)
              <input
                className="input"
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
              />
            </label>
            <label>
              Trả đồ (giờ Việt Nam)
              <input
                className="input"
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(event) =>
                  setForm({ ...form, endsAt: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Tổng tiền thuê (VND)
            <input
              className="input"
              inputMode="numeric"
              required
              value={form.rentAmount}
              onChange={(event) =>
                setForm({
                  ...form,
                  rentAmount: event.target.value.replace(/\D/g, ""),
                })
              }
            />
          </label>
          <label>
            Phụ kiện, tình trạng và điều kiện giao nhận
            <textarea
              className="input"
              rows={4}
              required
              minLength={20}
              maxLength={2000}
              value={form.terms}
              onChange={(event) =>
                setForm({ ...form, terms: event.target.value })
              }
            />
          </label>
          <p>{rentalReturnCopy['vi-VN']}</p>
          <label className="profile-check">
            <input
              type="checkbox"
              required
              checked={form.agreed}
              onChange={(event) =>
                setForm({ ...form, agreed: event.target.checked })
              }
            />
            Tôi xác nhận đề xuất và đã đọc{" "}
            <Link href="/cms/rental-guide" target="_blank">
              điều kiện thuê
            </Link>
            .
          </label>
          <button className="btn btn-primary" disabled={busy}>
            <FileCheck2 size={17} />
            Gửi đề xuất
          </button>
        </form>
      )}
      {data?.agreements.length === 0 && (
        <div className="rental-empty">
          <History size={29} />
          <p>Chưa có thỏa thuận được ghi nhận.</p>
          {!threadId && (
            <Link href="/dashboard/messages">Mở cuộc trao đổi</Link>
          )}
        </div>
      )}
      <div className="rental-list">
        <OrderScopeTabs tabs={[["all","Tất cả"],...Object.entries(STATES)]} active={orderFilter} onChange={setOrderFilter} counts={Object.fromEntries(["all",...Object.keys(STATES)].map(key=>[key,threadId?(data?.agreements||[]).filter(o=>key==="all"||o.status===key).length:accountCounts.counts["agreements."+key]]))} loading={!data||!threadId&&accountCounts.loading}/><small>Danh sách tải gần nhất: tối đa 50 thỏa thuận mỗi vai trò; số trên tab là tổng trạng thái, không phải số dòng đã tải.</small>
        {data?.agreements.filter(item=>orderFilter==="all"||item.status===orderFilter).map((item) => {
          const mine = (phase) =>
            item.confirmations.some(
              (vote) => vote.profile_id === user?.id && vote.phase === phase,
            );
          return (
            <article className="rental-item" key={item.id}>
              <header>
                <div>
                  <strong>Thỏa thuận {item.id.slice(0, 8)}</strong>
                  <p>{STATES[item.status]}</p>
                </div>
                <span className="profile-tag">
                  {new Intl.NumberFormat("vi-VN").format(
                    BigInt(item.rent_amount),
                  )}{" "}
                  đ
                </span>
              </header>
              <dl>
                <div>
                  <dt>Nhận đồ</dt>
                  <dd>
                    {new Date(item.starts_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Trả đồ</dt>
                  <dd>
                    {new Date(item.ends_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </dd>
                </div>
              </dl>
              <p className="rental-terms">{item.terms}</p>
              {item.returnAssessment&&<p role="status">Phí trả trễ dự kiến: {new Intl.NumberFormat('vi-VN').format(item.returnAssessment.amount)} đ · Cần hai bên đối chiếu, chưa tự động thu tiền.</p>}
              <p
                className={item.integrity.ok ? "rental-integrity" : "ops-error"}
              >
                {item.integrity.ok ? (
                  <ShieldCheck size={16} />
                ) : (
                  <ShieldAlert size={16} />
                )}{" "}
                {item.integrity.ok
                  ? "Lịch sử có chữ ký hệ thống, kiểm tra toàn vẹn đã đạt"
                  : "Lịch sử cần đối chiếu toàn vẹn. Đã ghi nhận cảnh báo hệ thống."}
              </p>
              <div className="profile-actions">
                {item.integrity.ok && (
                  <>
                    {item.status === "PROPOSED" && !mine("ACCEPT") && (
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() =>
                          mutate({ id: item.id, action: "ACCEPTED" })
                        }
                      >
                        <Check size={17} />
                        Đồng ý điều kiện thuê
                      </button>
                    )}
                    {item.status === "ACCEPTED" && !mine("HANDOVER") && (
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() =>
                          mutate({ id: item.id, action: "HANDOVER_CONFIRMED" })
                        }
                      >
                        <Check size={17} />
                        Xác nhận đã nhận / giao đồ
                      </button>
                    )}
                    {item.status === "ACTIVE" && !mine("RETURN") && (
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() =>
                          mutate({ id: item.id, action: "RETURN_CONFIRMED" })
                        }
                      >
                        <Check size={17} />
                        Xác nhận đã hoàn trả
                      </button>
                    )}
                    {item.status === "PROPOSED" &&
                      item.proposed_by === user?.id && (
                        <button
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() =>
                            mutate({ id: item.id, action: "CANCELLED" })
                          }
                        >
                          Hủy đề xuất
                        </button>
                      )}
                    {["ACCEPTED", "ACTIVE"].includes(item.status) && (
                      <button
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() =>
                          mutate({ id: item.id, action: "DISPUTED" })
                        }
                      >
                        <ShieldAlert size={17} />
                        Gửi yêu cầu tranh chấp
                      </button>
                    )}
                  </>
                )}
                {!threadId && (
                  <Link
                    className="btn btn-ghost"
                    href={
                      "/dashboard/messages?" +
                      new URLSearchParams({ thread: item.thread_id })
                    }
                  >
                    Cuộc trao đổi
                  </Link>
                )}
              </div>
              <details className="rental-timeline">
                <summary>
                  <History size={16} />
                  Lịch sử xác nhận ({item.events.length})
                </summary>
                {item.events.map((event) => (
                  <div key={event.id}>
                    <span>{EVENTS[event.event] || "Ghi nhận"}</span>
                    <small>
                      {new Date(event.created_at).toLocaleString("vi-VN")}
                    </small>
                    <p>
                      {event.anchor.status === "CONFIRMED"
                        ? `Đã neo EVM · ${event.anchor.transaction_hash}`
                        : "Chưa neo EVM"}
                    </p>
                  </div>
                ))}
              </details>
              <RentalPayment agreement={item} payer={item.renter_id===user?.id}/>
            </article>
          );
        })}
      </div>
    </section>
  );
}
