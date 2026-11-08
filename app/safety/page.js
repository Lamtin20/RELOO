"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  LoaderCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { ShieldAlert as PendingShield, ShieldCheck as ConfirmedShield } from 'lucide';
import { MorphIcon } from '@/components/ui/MorphIcon';
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { useAuth } from "@/lib/store";
import { EmailExposure } from '@/components/security/EmailExposure';
const LABELS = {
  MATCH: "Có thông tin cần đối chiếu",
  NO_MATCH: "Không có kết quả khớp trong phạm vi đã kiểm tra",
  UNKNOWN: "Chưa đủ thông tin để kết luận",
  UNAVAILABLE: "Chưa kiểm tra được nguồn",
  STALE: "Kết quả đã quá hạn",
};
export default function SafetyPage() {
  const { user, refreshSession } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [evidence, setEvidence] = useState("");
  const [success, setSuccess] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState(null);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/security/profile");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetch('/api/security/profile', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [user]);
  const checking = ['QUEUED', 'RUNNING'].includes(data?.job?.status);
  useEffect(() => {
    if (user && data?.activation && data.activation !== user.activationStatus) refreshSession().catch(() => {});
  }, [data?.activation, user, refreshSession]);
  useEffect(() => {
    if (!checking) return;
    const interval = setInterval(load, 5000);
    const timeout = setTimeout(() => clearInterval(interval), 120000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [checking, load]);
  const activeCase = data?.cases?.find((item) => item.status !== "CLEARED");
  async function recheck() {
    setRetrying(true);
    setError('');
    setRetryMessage(null);
    try {
      const response = await fetch('/api/security/recheck', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const job = result.identifier.job;
      setRetryMessage({ message: job.queued || ['QUEUED', 'RUNNING'].includes(job.job_status)
        ? 'Đã nhận yêu cầu kiểm tra. Kết quả sẽ cập nhật khi tra cứu hoàn tất.'
        : `Đã kiểm tra gần đây. Có thể yêu cầu lại sau ${new Date(job.retry_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.` });
      await load();
    } catch (cause) { setRetryMessage({ message: cause.message, error: true }); }
    finally { setRetrying(false); }
  }
  async function appeal(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/security/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: activeCase.id,
          explanation,
          evidence: evidence
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccess(
        "Yêu cầu đã được lưu. Quản trị sẽ đối chiếu thông tin trong hồ sơ.",
      );
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketplaceShell>
      <div className="container safety-page">
        <div className="feature-heading">
          <span className="feature-icon feature-icon--blue">
            <ShieldCheck size={25} />
          </span>
          <div>
            <span className="r-eyebrow">TRUNG TÂM AN TOÀN RELOO</span>
            <h1>Hồ sơ an toàn của bạn</h1>
          </div>
        </div>
        <p className="feature-lead">
          Trạng thái kiểm tra, thông tin đối chiếu và yêu cầu xác minh được lưu
          cùng hồ sơ.
        </p>
        {!user ? (
          <div className="feature-empty">
            <ShieldCheck size={36} />
            <h2>Đăng nhập để xem hồ sơ</h2>
            <Link href="/auth?next=%2Fsafety" className="btn btn-primary">
              Đăng nhập <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <div className="safety-status">
              <MorphIcon icon={data?.activation === 'ACTIVE' ? ConfirmedShield : PendingShield} size={24} />
              <div>
                <strong>
                  {data?.activation === "ACTIVE"
                    ? "Được phép sử dụng nghiệp vụ"
                    : data?.activation === "RESTRICTED"
                      ? "Tài khoản đang bị hạn chế"
                      : "Tài khoản đang chờ xác minh"}
                </strong>
                <p>
                  {LABELS[data?.screening] ||
                    "Chưa lấy được trạng thái kiểm tra."}
                </p>
              </div>
              <button
                className="icon-tool"
                type="button"
                onClick={load}
                disabled={busy}
                title="Cập nhật trạng thái"
                aria-label="Cập nhật trạng thái"
              >
                {busy ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
              </button>
            </div>
            <section className="safety-next-step">
              {checking ? <p role="status"><LoaderCircle size={17} className="spin" />Đang tra cứu thông tin. Kết quả trước đó vẫn được giữ bên dưới.</p> : <p>
                {data?.activation === 'ACTIVE'
                  ? 'Hồ sơ đã được xác minh trong thời hạn được cấp.'
                  : data?.activation === 'RESTRICTED'
                    ? 'Hồ sơ cần được đối chiếu trước khi gỡ hạn chế. Bạn có thể gửi yêu cầu xem xét.'
                    : 'Chưa đủ kết quả đối chiếu để tự động kích hoạt. Bạn có thể bổ sung xác minh và gửi yêu cầu xét duyệt.'}
              </p>}
              {data?.checks?.[0]?.checked_at && <small>Lần kiểm tra gần nhất: {new Date(data.checks[0].checked_at).toLocaleString('vi-VN')}</small>}
              <div className="safety-actions">
                <button type="button" className="btn btn-secondary" onClick={recheck} disabled={busy || retrying || checking}>
                  {retrying || checking ? <LoaderCircle size={17} className="spin" /> : <RefreshCw size={17} />}Kiểm tra lại
                </button>
                {data?.activation !== 'ACTIVE' && <Link className="btn btn-primary" href="/dashboard/kyc/verify"><FileCheck2 size={17} />Xác minh danh tính</Link>}
                {activeCase && <a href="#review-request" className="safety-review-link">Gửi yêu cầu xét duyệt <ArrowRight size={16} /></a>}
              </div>
              {retryMessage && <p className={retryMessage.error ? 'feature-error' : 'feature-success'} role={retryMessage.error ? 'alert' : 'status'}>{retryMessage.message}</p>}
            </section>
            {data?.warnings?.length > 0 && (
              <section className="safety-sources">
                <h2>Thông tin cần bạn đối chiếu</h2>
                {data.warnings.map((warning) => (
                  <div key={warning.id}>
                    <div>
                      <strong>
                        {warning.kind === 'BANK' ? 'Tài khoản ngân hàng' : warning.kind === 'EMAIL' ? 'Email' : 'Số điện thoại / Zalo'} · {warning.value}
                      </strong>
                      <p>
                        Thông tin trùng với cảnh báo cần được kiểm tra. Bạn có thể đối chiếu và gửi yêu cầu xem xét bên dưới.
                      </p>
                      <a href={warning.url || 'https://chongluadao.vn/analyze/'} target="_blank" rel="noopener noreferrer" className="safety-source-link"><ExternalLink size={14} />Kiểm tra nhanh tại Chống Lừa Đảo</a>
                    </div>
                    <span>Cần đối chiếu</span>
                  </div>
                ))}
              </section>
            )}
            {activeCase && (
              <section className="safety-appeal" id="review-request">
                <div className="feature-heading">
                  <FileCheck2 size={22} />
                  <div>
                    <h2>Gửi thông tin xác minh / khiếu nại</h2>
                    <p>
                      Hồ sơ {activeCase.id.slice(0, 8)} ·{" "}
                      {activeCase.status === "APPEALED"
                        ? "Đã nhận yêu cầu"
                        : "Đang đối chiếu"}
                    </p>
                  </div>
                </div>
                <form onSubmit={appeal}>
                  <label>
                    Thông tin bạn muốn đối chiếu
                    <textarea
                      required
                      minLength={20}
                      maxLength={4000}
                      value={explanation}
                      onChange={(event) => setExplanation(event.target.value)}
                      rows={5}
                    />
                  </label>
                  <label>
                    Liên kết bằng chứng (tối đa 5)
                    <textarea
                      value={evidence}
                      onChange={(event) => setEvidence(event.target.value)}
                      placeholder="Liên kết HTTPS, mỗi dòng một liên kết"
                      rows={3}
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={busy}
                  >
                    <FileCheck2 size={17} />
                    Gửi yêu cầu xác minh
                  </button>
                </form>
              </section>
            )}
            {success && (
              <p className="feature-success" role="status">
                {success}
              </p>
            )}
            <EmailExposure email={user.email}/>
          </>
        )}
        {error && user && (
          <p className="feature-error" role="alert">
            {error}
          </p>
        )}
        <section className="safety-principles">
          <h2>Thông tin minh bạch, quyết định có căn cứ</h2>
          <p>
            Chưa kiểm tra được hoặc kết quả quá hạn không có nghĩa là một tài
            khoản an toàn hay đã vi phạm. Nếu có thông tin khớp, RELOO hạn chế
            nghiệp vụ và mở hồ sơ để đối chiếu bằng chứng.
          </p>
          <p>
            Các tài khoản cùng dùng một mạng không mặc nhiên được coi là cùng
            người. Hạn chế liên quan IP chỉ áp dụng cho tài khoản, nghiệp vụ và
            thời hạn được chỉ định.
          </p>
          <div>
            <a
              href="https://chongluadao.vn/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chống Lừa Đảo <ArrowRight size={14} />
            </a>
            <a
              href="https://checkscam.vn/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CheckScam <ArrowRight size={14} />
            </a>
          </div>
        </section>
      </div>
    </MarketplaceShell>
  );
}
