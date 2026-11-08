"use client";
import {IdentitySuccess} from '@/components/profile/IdentitySuccess';
import {IDENTITY_NOTICE_VERSION} from '@/lib/privacy/identity-policy';
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  IdCard,
  UserRound,
  Camera,
  Clock3,
  Check,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { IdentityCapture } from "@/components/profile/IdentityCapture";
import { IdentityConsent } from "@/components/profile/IdentityConsent";
import {IdentityQrCard} from '@/components/profile/IdentityQrCard';
const dateTime = (v) =>
  new Date(v).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export default function KycVerifyPage(){const {user}=useAuth();return user?<KycSession key={user.id} user={user}/>:null;}
function KycSession({user}) {
  const {refreshSession}=useAuth();
  const userId=user?.id,initialCapture=useRef(false),submitLock=useRef(false);
  const [loaded,setLoaded]=useState(false);
  const [submissions, setSubmissions] = useState([]),
    [capture, setCapture] = useState(null),
    [wizard, setWizard] = useState(false),
    [consent, setConsent] = useState(false),
    [entry,setEntry]=useState(false),[checking,setChecking]=useState(false),[checks,setChecks]=useState(null),
    [business, setBusiness] = useState(null),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),[approved,setApproved]=useState(false),[expiryReceipt,setExpiryReceipt]=useState(null),[qrFields,setQrFields]=useState(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/kyc"),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    setSubmissions(d.submissions);setLoaded(true);
  }, []);
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(t);
  }, [userId, load]);
  const current = submissions.find((s) => !s.superseded_at),
    pending =
      current && ["REVIEW", "QUEUED", "PROCESSING"].includes(current.status);
  useEffect(() => {
    if (loaded&&!initialCapture.current&&!pending&&!current&&!wizard&&!capture){initialCapture.current=true;void start({preventDefault(){}});}
  }, [loaded,pending, current, wizard, capture]);
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => load().catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [pending, load]);
  async function start(e) {
    e.preventDefault();
    setError("");
    setApproved(false);setSuccess('');setExpiryReceipt(null);
    setBusy(true);
    setCapture(null);setQrFields(null);setChecks(null);setWizard(false);
    try {
      const r = await fetch("/api/business"),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      // Check controller readiness and obtain processing consent before capture.
      setBusiness(d);setEntry(true);

    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reviewCapture(data) {
    setCapture(data);setWizard(false);setConsent(true);setChecking(true);setChecks(null);setExpiryReceipt(null);setError('');
    try {
      const f=new FormData();
      f.set('consent','true');f.set('consentVersion',IDENTITY_NOTICE_VERSION);
      f.set('businessVersion',String(business.version));f.set('qrPayload',data.qrPayload);
      f.set('photoSessionId',data.sessionId);f.set('captureManifest',JSON.stringify(data.manifest));
      for(const kind of ['front','back'])f.set(kind,data.files[kind]);
      const r=await fetch('/api/kyc/preview',{method:'POST',body:f,signal:AbortSignal.timeout(75000)}),d=await r.json();
      if(!r.ok)throw Error(d.error||'Chưa thể kiểm tra ảnh. Hãy thử lại.');
      setChecks(d.checks);setExpiryReceipt(d.expiryReceipt||null);
    } catch(e){setChecks({reason:'CHECK_UNAVAILABLE',eligible:false});setError(e.name==='TimeoutError'?'Kiểm tra ảnh mất nhiều thời gian. Bạn có thể chụp lại hoặc gửi để admin kiểm tra.':e.message);}
    finally{setChecking(false);}
  }
  async function submit() {
    if(submitLock.current)return;submitLock.current=true;
    if(!capture?.qrFields?.nationalId){submitLock.current=false;setConsent(false);setError('Cần quét mã QR trên thẻ căn cước trước khi gửi hồ sơ.');return;}
    setBusy(true);
    setError("");
    try {
      const f = new FormData();
      f.set("consent", "true");
      f.set("consentVersion", IDENTITY_NOTICE_VERSION);
      f.set("qrAcknowledged","true");
      if(expiryReceipt)f.set("expiryReceipt",expiryReceipt);
      f.set("qrPayload",capture.qrPayload);
      f.set("businessVersion", String(business.version));
      f.set("selfieSource", "CAMERA");
      f.set("photoSessionId", capture.sessionId);
      f.set("captureManifest", JSON.stringify(capture.manifest));
      for (const [kind, file] of Object.entries(capture.files))
        f.set(kind, file);
      const r = await fetch("/api/kyc", { method: "POST", body: f }),
        d = await r.json();
      if (d.code === "CONSENT_UPDATED") {
        const updated = await fetch("/api/business").then((r) => r.json());
        if (updated.ok) {setBusiness(updated);setConsent(false);setCapture(null);setChecks(null);setEntry(true);}
      }
      if (!r.ok) throw Error(d.error);
      setCapture(null);
      setConsent(false);
      setEditing(false);
      setApproved(d.status==='APPROVED');
      setSuccess(d.status==='APPROVED'?'Xác thực thành công':
        "Đã nhận hồ sơ. Admin kiểm duyệt tối đa 3 ngày, trước " +
          dateTime(d.reviewDueAt) +
          ".",
      );
      await load();
      if(d.status==='APPROVED')await refreshSession();
    } catch (e) {
      setError(e.message);
    } finally {
      submitLock.current=false;setBusy(false);
    }
  }
  if (!user) return null;
  return (
    <div className="dashboard-page identity-page">
      <header className="profile-header">
        <div className="profile-avatar">
          <IdCard size={28} />
        </div>
        <div>
          <h1>Xác thực căn cước</h1>
          <p>Chụp căn cước và chân dung để xác minh tài khoản.</p>
        </div>
      </header>
      {error && !consent && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      {approved&&<IdentitySuccess/>}
      {success && !approved && (
        <p role="status" className="cashflow-success">
          {success}
        </p>
      )}
      {!wizard&&!entry&&!consent&&!pending&&current?.status!=='APPROVED'&&<button type="button" className="btn btn-primary" disabled={busy} onClick={start}><Camera size={18}/>Bắt đầu xác thực</button>}
      {current && (
        <article className="identity-status">
          <span className="profile-tag">
            <Clock3 size={16} />
            {pending
              ? "Chờ kiểm duyệt"
              : current.status === "APPROVED"
                ? "Đã duyệt"
                : "Cần cập nhật hồ sơ"}
          </span>
          <h2>Hồ sơ căn cước của bạn</h2>
          <p>{current.verificationMethod==='QR_ONLY_V1'&&current.status==='APPROVED'?'Đã duyệt thông tin từ mã QR.':current.reason||'Hồ sơ đang chờ đối chiếu.'}</p>
          <dl className="kyc-extracted">
            <div>
              <dt>Số căn cước</dt>
              <dd>{current.nationalId || "Chưa bổ sung"}</dd>
            </div>
            <div>
              <dt>Ngày hết hạn</dt>
              <dd>
                {current.declared_expiry?.split("-").reverse().join("/") ||
                  "Chưa bổ sung"}
              </dd>
            </div>
          </dl>
          {pending && (
            <p>
              Hạn kiểm duyệt: {dateTime(current.review_due_at)}
              {current.overdue ? " · Đã chuyển ưu tiên xử lý" : ""}
            </p>
          )}
          {current.reason && <p>{current.reason}</p>}
          {["REJECTED", "EXPIRED"].includes(current.status) && <button
            className="btn btn-primary"
            type="button"
            aria-label="Chụp lại căn cước"
            onClick={() => {
              setEditing(true);
              setCapture(null);
              setQrFields(null);
              start({preventDefault(){}});
            }}
          >
            <RefreshCw size={16} />
            Chụp lại căn cước
          </button>}
        </article>
      )}
      {entry&&<IdentityConsent phase="entry" business={business} onClose={()=>setEntry(false)} onAgree={()=>{setEntry(false);setWizard(true);}}/>}
      {wizard && (
        <IdentityCapture onQr={fields=>setQrFields(fields)}
          onCancel={() => {setWizard(false);setQrFields(null);setCapture(null);}}
          onComplete={reviewCapture}
        />
      )}
      {consent && capture && (
        <IdentityConsent key={business?.version}
          fields={capture.qrFields}
          phase={checking?"checking":"review"}
          checks={checks}
          business={business}
          busy={busy}
          error={error}
          onClose={() => setConsent(false)}
          onRetake={() => {setConsent(false);void start({preventDefault(){}});}}
          onAgree={submit}
        />
      )}
    </div>
  );
}
