"use client";
import {SupportInbox} from './SupportInbox';
import {ServiceReview} from './ServiceReview';
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarClock,
  Camera,
  Check,
  ClipboardList,
  Download,
  FileText,
  FileCheck2,
  Headset,
  Image as ImageIcon,
  IdCard,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserRound,
  X,
  LogOut,
} from "lucide-react";
import {CrmNavigation} from "./CrmNavigation";
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import ControlCenter from './ControlCenter';
import {NeighborhoodAdmin} from '@/components/neighborhood/NeighborhoodAdmin';
import {text as neighborhoodText} from '@/lib/neighborhood/content';
import { BusinessSettings } from "@/components/owner/BusinessSettings";
import { LegalRegistry } from "@/components/owner/LegalRegistry";
import { FinanceWorkspace } from "@/components/owner/FinanceWorkspace";
import { IntegrityWorkspace } from "@/components/owner/IntegrityWorkspace";
import {PurchaseSupport} from "./PurchaseSupport";
import { KycReview } from "@/components/owner/KycReview";
import { BrandSettings } from "@/components/owner/BrandSettings";
import { NewsManager } from "@/components/owner/NewsManager";
import { BannerManager } from "@/components/owner/BannerManager";
import { CustomerManager } from "@/components/owner/CustomerManager";
import { SePayWorkspace } from "@/components/owner/SePayWorkspace";
import { PromotionManager } from "@/components/owner/PromotionManager";
import { StaffManager } from "@/components/owner/StaffManager";
import { crmViews, crmAllowed } from "@/lib/operations/access";
import {
  EXTRA_FIELD_LABELS,
  STATUS_LABELS,
} from "@/lib/operations/extra-labels";
import {
  CRM_MODULES,
  CRM_STATES,
  FIELD_LABELS as BASE_FIELD_LABELS,
} from "@/lib/operations/modules";
const FIELD_LABELS = { ...BASE_FIELD_LABELS, ...EXTRA_FIELD_LABELS };
const VIEWS = {
  analytics:["Traffic & SEO Control",Activity],
  control:['Trung tâm vận hành',Activity],
  neighborhood:[neighborhoodText('vi-VN','brand'),Users],
  virtualAccounts: ["Tài khoản ảo SePay", Landmark],
  integrity: ["Toàn vẹn & giả mạo", ShieldAlert],
  finance: ["Đối soát & hóa đơn", Landmark],
  legal: ["Hồ sơ pháp lý", FileCheck2],
  branding: ["Icon & logo", ImageIcon],
  news: ["Tin tức & SEO", FileText],
  banners: ["Banner & POSM", ImageIcon],
  settings: ["Pháp nhân & kết nối", ShieldCheck],
  overview: ["Tổng quan", Activity],
  customers: ["Khách hàng", Users],
  ...Object.fromEntries(
    Object.entries(CRM_MODULES).map(([key, value]) => [
      key,
      [
        value.label,
        key === "bots"
          ? Bot
          : key === "support"
            ? Headset
            : key === "accounting" || key === "tax"
              ? Landmark
              : FileText,
      ],
    ]),
  ),
  blacklist: ["Danh sách đen", ShieldAlert],
  cases: ["Xác minh & khiếu nại", ShieldAlert],
  conversations: ["Hội thoại hỗ trợ", Headset],
  kyc: ["Định danh", LockKeyhole],
  jobs: ["Hàng đợi", CalendarClock],
  traffic: ["API & hành trình", Activity],
  staff: ["Phân quyền", Users],
};
async function api(path, body) {
  const response = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const data = await response.json();
  if (!response.ok || !data.ok)
    throw Object.assign(new Error(data.error || "Chưa tải được dữ liệu."), {code:data.code,status:response.status});
  return data;
}
function exportCsv(rows, name) {
  const csv = rows
    .map((row) =>
      row
        .map(
          (value) =>
            `"${String(value ?? "")
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""')}"`,
        )
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
export default function CrmWorkspace({initialSession,initialView}) {
  const [session, setSession] = useState(initialSession),
    [overview, setOverview] = useState(null),
    [records, setRecords] = useState([]),
    [view, setView] = useState(initialView),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editor, setEditor] = useState(null),
    [decision, setDecision] = useState(null),
    [reason, setReason] = useState(""),
    [cases, setCases] = useState([]),
    [kycDetail, setKycDetail] = useState(null),
    [analysis, setAnalysis] = useState(null);
  const config = CRM_MODULES[view];
  const allowedViews=crmViews(session?.staff),allowed=(p)=>crmAllowed(session?.staff,p);
  useEffect(()=>{
    if(!session?.expiresAt)return;
    const t=setTimeout(()=>window.location.replace("/crm/login?next="+encodeURIComponent("/crm?view="+view)),Math.max(0,session.expiresAt-Date.now()));
    return ()=>clearTimeout(t);
  },[session?.expiresAt,view]);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const authenticated = await api("/api/crm/session");
      setSession(authenticated);
      const permitted=crmViews(authenticated.staff);
      if(!permitted.includes(view)){setOverview(null);setRecords([]);setView(permitted[0]);return;}
      setOverview(['control','analytics'].includes(view)?{}:await api("/api/crm/overview"));
      if (config && view!=="promotions")
        setRecords((await api(`/api/crm/records?module=${view}`)).records);
      if (view === "cases") setCases((await api("/api/crm/cases")).cases);
      if (view === "conversations")
        setRecords((await api("/api/crm/conversations")).conversations);
    } catch (cause) {
      if(cause.status===401 || ["CRM_MFA_REQUIRED","CRM_ACCESS_DENIED"].includes(cause.code)){
        setSession(null);setOverview(null);setRecords([]);
        window.location.replace("/crm/login?next="+encodeURIComponent("/crm?view="+view));return;
      }
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }, [config, view]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setEditor(null);
      setDecision(null);
      setQuery("");
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(()=>{const t=setInterval(()=>load(),60000);return ()=>clearInterval(t);},[load]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = { ...editor.data };
      for (const field of config.fields.filter((field) => field.endsWith("At")))
        if (data[field]) data[field] = new Date(data[field]).toISOString();
      await api("/api/crm/records", { ...editor, data, module: view });
      setEditor(null);
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  async function review(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/crm/decisions", { ...decision, reason });
      setDecision(null);
      setReason("");
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  const table =
    view === "cases"
      ? cases
      : view === "customers"
        ? overview?.customers
        : view === "blacklist"
          ? overview?.blacklist
          : view === "kyc"
            ? overview?.kyc
            : view === "jobs"
              ? overview?.jobs
              : view === "traffic"
                ? overview?.traces
                : view === "staff"
                  ? overview?.staff
                  : records;
  const filtered = (table || []).filter((record) =>
    JSON.stringify(record).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="ops-shell ops-shell--grouped">
      <CrmNavigation views={VIEWS} allowedViews={allowedViews} view={view} session={session} busy={busy}
        onNavigate={key=>{setView(key);window.history.replaceState(null,"","/crm?view="+key);}}
        onRefresh={load} onLogout={async()=>{try{await api('/api/crm/access',{action:'LOGOUT'});window.location.replace('/crm/login');}catch(e){setError(e.message);}}}/>
      <main className="ops-main">
        <header className="ops-section-heading"><h1>{VIEWS[view]?.[0]||'CRM'}</h1><p>RELOO CRM</p></header>
        {session && allowed("reports.read") && ["overview", "traffic", "bots"].includes(view) && (
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setAnalysis(await api("/api/crm/analysis", {}));
              } catch (cause) {
                setError(cause.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Bot size={17} />
            Phân tích hoạt động
          </button>
        )}
        {analysis && (
          <section className="ops-editor">
            <h2>Phân tích vận hành</h2>
            <p
              style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}
            >
              {analysis.answer}
            </p>
            <small>
              {analysis.facts.period} · {analysis.model}
            </small>
            <button
              className="icon-tool"
              title="Đóng kết quả"
              onClick={() => setAnalysis(null)}
            >
              <X size={17} />
            </button>
          </section>
        )}
        {error && (
          <p className="ops-error" role="alert">
            {error}
          </p>
        )}
        {!session && !busy && (
          <Link className="btn btn-primary" href="/auth?next=%2Fcrm">
            Đăng nhập
          </Link>
        )}
        {session && overview && (
          <>
            {view === "analytics" ? (<AnalyticsDashboard key={session?.user?.id} admin/>) : view === "control" ? (
              <ControlCenter />
            ) : view === "virtualAccounts" ? (
              <SePayWorkspace customers={overview.customers} />
            ) : view === "staff" ? (
              <StaffManager customers={overview.customers} />
            ) : view === "promotions" ? (
              <PromotionManager customers={overview.customers} />
            ) : view === "branding" ? (
              <BrandSettings />
            ) : view === "neighborhood" ? (
              <NeighborhoodAdmin />
            ) : view === "news" ? (
              <NewsManager />
            ) : view === "banners" ? (
              <BannerManager />
            ) : view === "customers" ? (
              <CustomerManager customers={overview.customers} />
            ) : view === "integrity" ? (
              <IntegrityWorkspace />
            ) : view === "finance" ? (
              <FinanceWorkspace customers={overview.customers} />
            ) : view === "legal" ? (
              <LegalRegistry />
            ) : view === "settings" ? (
              <BusinessSettings />
            ) : view === "overview" ? (
              <>
                <div className="ops-metrics">
                  {[
                    ["Khách hàng", overview.customers.length],
                    ["Đơn ghi nhận", overview.orders.length],
                    [
                      "Hồ sơ rủi ro",
                      overview.blacklist.filter(
                        (record) => record.status !== "CLEARED",
                      ).length,
                    ],
                    [
                      "Lượt trang / 7 ngày",
                      overview.events.filter(
                        (record) => record.event === "PAGE_VIEW",
                      ).length,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <h2 style={{ fontSize: 18, margin: "24px 0" }}>
                  Hoạt động cần xử lý
                </h2>
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead>
                      <tr>
                        <th>Nghiệp vụ</th>
                        <th>Số lượng</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          "kyc",
                          overview.kyc.filter(
                            (record) => record.status === "REVIEW",
                          ).length,
                        ],
                        [
                          "jobs",
                          overview.jobs.filter(
                            (record) => record.status === "FAILED",
                          ).length,
                        ],
                        [
                          "blacklist",
                          overview.blacklist.filter(
                            (record) => record.status === "REVIEW",
                          ).length,
                        ],
                      ].map(([key, count]) => (
                        <tr key={key}>
                          <td>{VIEWS[key][0]}</td>
                          <td>{count}</td>
                          <td>
                            {view === "conversations" && (
                              <button
                                className="icon-tool"
                                title="Xem hội thoại"
                                onClick={() =>
                                  setEditor({ conversationDetails: record })
                                }
                              >
                                <ClipboardList size={17} />
                              </button>
                            )}
                            <button
                              className="icon-tool"
                              title="Mở danh sách"
                              onClick={() => setView(key)}
                            >
                              <ArrowUpRight size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {view === "support" && <><ServiceReview canWrite={allowed('support.write')}/><SupportInbox canWrite={allowed('support.write')}/><PurchaseSupport/></>}
                <div className="ops-toolbar">
                  {view === "kyc" && (
                    <span>
                      Chờ duyệt:{" "}
                      <strong>{overview.kycReview?.pending || 0}</strong> · Quá
                      hạn:{" "}
                      <strong className="kyc-overdue-label">
                        {overview.kycReview?.overdue || 0}
                      </strong>
                    </span>
                  )}
                  <Search size={18} />
                  <input
                    className="input"
                    placeholder="Tìm trong danh sách"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button
                    className="icon-tool"
                    title="Xuất CSV"
                    aria-label="Xuất CSV"
                    onClick={() =>
                      exportCsv(
                        [
                          ["ID", "Tên / luồng", "Trạng thái"],
                          ...filtered.map((record) => [
                            record.id || record.profile_id,
                            record.title ||
                              record.name ||
                              record.route ||
                              record.kind ||
                              record.role,
                            record.status ||
                              record.activation_status ||
                              record.enabled,
                          ]),
                        ],
                        view,
                      )
                    }
                  >
                    <Download size={18} />
                  </button>
                  {config && (
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        setEditor({ title: "", status: "DRAFT", data: {} })
                      }
                    >
                      <Plus size={17} />
                      Tạo mới
                    </button>
                  )}
                  {view === "staff" && (
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        setDecision({
                          kind: "staff",
                          id: "",
                          role: "staff",
                          permissions: ["crm.read", "reports.read"],
                          enabled: true,
                        })
                      }
                    >
                      <Plus size={17} />
                      Cấp quyền
                    </button>
                  )}
                  {["jobs", "affiliate"].includes(view) && (
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          await api("/api/crm/jobs", {
                            kind: "SYNC_AFFILIATE_CATALOG",
                          });
                          await load();
                        } catch (cause) {
                          setError(cause.message);
                        }
                      }}
                    >
                      Đồng bộ sản phẩm
                    </button>
                  )}
                </div>
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead>
                      <tr>
                        <th>Tên / luồng</th>
                        <th>Trạng thái</th>
                        <th>
                          {view === "kyc"
                            ? "Hạn kiểm duyệt · tối đa 3 ngày"
                            : "Thông tin"}
                        </th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((record) => (
                        <tr
                          key={
                            record.id ||
                            record.profile_id ||
                            `${record.created_at}-${record.route}`
                          }
                        >
                          <td>
                            {view === "jobs" && record.status === "FAILED" && (
                              <button
                                className="icon-tool"
                                title="Thử lại tác vụ"
                                onClick={async () => {
                                  try {
                                    await api("/api/crm/jobs", {
                                      retryId: record.id,
                                    });
                                    await load();
                                  } catch (cause) {
                                    setError(cause.message);
                                  }
                                }}
                              >
                                <RefreshCw size={17} />
                              </button>
                            )}
                            {record.title ||
                              record.profiles?.name ||
                              record.name ||
                              record.route ||
                              record.kind ||
                              record.profile_id}
                          </td>
                          <td>
                            {view === "cases" &&
                              record.status !== "CLEARED" && (
                                <>
                                  <button
                                    className="icon-tool"
                                    title="Bắt đầu xác minh"
                                    onClick={() =>
                                      setDecision({
                                        kind: "case",
                                        id: record.id,
                                        action: "VERIFY",
                                      })
                                    }
                                  >
                                    <Search size={17} />
                                  </button>
                                  <button
                                    className="icon-tool"
                                    title="Gỡ hạn chế sau xác minh"
                                    onClick={() =>
                                      setDecision({
                                        kind: "case",
                                        id: record.id,
                                        action: "CLEAR",
                                        evidenceUrl: "",
                                      })
                                    }
                                  >
                                    <Check size={17} />
                                  </button>
                                  <button
                                    className="icon-tool"
                                    title="Xem bằng chứng và khiếu nại"
                                    onClick={() =>
                                      setEditor({ caseDetails: record })
                                    }
                                  >
                                    <ClipboardList size={17} />
                                  </button>
                                </>
                              )}
                            <span className="ops-badge">
                              {STATUS_LABELS[
                                record.status ||
                                  record.activation_status ||
                                  (record.enabled ? "ACTIVE" : "DISABLED")
                              ] || "Chờ xử lý"}
                            </span>
                          </td>
                          <td>
                            {view === "customers" ? (
                              `${record.email || ""} · ${record.phone || ""}`
                            ) : view === "traffic" ? (
                              `${record.method} · ${record.duration_ms} ms`
                            ) : view === "blacklist" ? (
                              record.reason
                            ) : view === "kyc" ? (
                              <>
                                <span
                                  className={
                                    record.overdue ? "kyc-overdue-label" : ""
                                  }
                                >
                                  {record.review_due_at
                                    ? new Date(
                                        record.review_due_at,
                                      ).toLocaleString("vi-VN", {
                                        timeZone: "Asia/Ho_Chi_Minh",
                                      })
                                    : "Chưa có hạn duyệt"}
                                  {record.overdue &&
                                    " · Quá hạn, ưu tiên xử lý"}
                                </span>
                                {!record.declared_expiry && (
                                  <p>Khách cần bổ sung ngày hết hạn</p>
                                )}
                              </>
                            ) : view === "staff" ? (
                              record.permissions.join(", ")
                            ) : record.created_at ? (
                              new Date(record.created_at).toLocaleString(
                                "vi-VN",
                              )
                            ) : (
                              ""
                            )}
                          </td>
                          <td>
                            {config && (
                              <button
                                className="icon-tool"
                                title="Chỉnh sửa"
                                onClick={() => setEditor(record)}
                              >
                                <ClipboardList size={17} />
                              </button>
                            )}
                            {view === "blacklist" &&
                              record.status !== "CLEARED" && (
                                <>
                                  <button
                                    className="icon-tool"
                                    title="Xác nhận danh sách đen"
                                    onClick={() =>
                                      setDecision({
                                        kind: "blacklist",
                                        id: record.id,
                                        action: "CONFIRMED",
                                      })
                                    }
                                  >
                                    <ShieldAlert size={17} />
                                  </button>
                                  <button
                                    className="icon-tool"
                                    title="Gỡ mục hạn chế"
                                    onClick={() =>
                                      setDecision({
                                        kind: "blacklist",
                                        id: record.id,
                                        action: "CLEARED",
                                      })
                                    }
                                  >
                                    <Check size={17} />
                                  </button>
                                </>
                              )}
                            {view === "kyc" && record.status === "REVIEW" && (
                              <>
                                <button
                                  className="icon-tool"
                                  title="Xem hồ sơ và ba ảnh"
                                  onClick={async () => {
                                    try {
                                      setKycDetail(
                                        await api(
                                          `/api/crm/kyc?id=${record.id}`,
                                        ),
                                      );
                                    } catch (cause) {
                                      setError(cause.message);
                                    }
                                  }}
                                >
                                  <ClipboardList size={17} />
                                </button>
                                <a
                                  href={`/api/kyc/documents?id=${record.id}&kind=front`}
                                  target="_blank"
                                  title="Xem giấy tờ"
                                >
                                  <ImageIcon size={17} />
                                </a>
                                <a
                                  href={`/api/kyc/documents?id=${record.id}&kind=back`}
                                  target="_blank"
                                  title="Xem mặt sau"
                                >
                                  <IdCard size={17} />
                                </a>
                                <a
                                  href={`/api/kyc/documents?id=${record.id}&kind=selfie`}
                                  target="_blank"
                                  title="Xem chân dung"
                                >
                                  <UserRound size={17} />
                                </a>
                                <button
                                  className="icon-tool"
                                  title="Duyệt hồ sơ"
                                  onClick={() =>
                                    setDecision({
                                      kind: "kyc",
                                      id: record.id,
                                      action: "APPROVED",
                                    })
                                  }
                                >
                                  <Check size={17} />
                                </button>
                                <button
                                  className="icon-tool"
                                  title="Từ chối hồ sơ"
                                  onClick={() =>
                                    setDecision({
                                      kind: "kyc",
                                      id: record.id,
                                      action: "REJECTED",
                                    })
                                  }
                                >
                                  <X size={17} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <p className="ops-empty">Chưa có bản ghi.</p>
                  )}
                </div>
                {view === "traffic" && (
                  <>
                    <h2 style={{ fontSize: 18, margin: "24px 0" }}>
                      Hành trình được đồng ý ghi nhận
                    </h2>
                    <div className="ops-table-wrap">
                      <table className="ops-table">
                        <thead>
                          <tr>
                            <th>Sự kiện</th>
                            <th>Trang</th>
                            <th>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.events.slice(0, 50).map((event, index) => (
                            <tr key={index}>
                              <td>{event.event}</td>
                              <td>{event.path}</td>
                              <td>
                                {new Date(event.created_at).toLocaleString(
                                  "vi-VN",
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
            {editor && config && (
              <form className="ops-editor" onSubmit={save}>
                <h2>{editor.id ? "Chỉnh sửa" : "Tạo mới"}</h2>
                <div className="ops-form-grid">
                  <label className="full">
                    Tiêu đề
                    <input
                      className="input"
                      required
                      maxLength={200}
                      value={editor.title}
                      onChange={(event) =>
                        setEditor({ ...editor, title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Trạng thái
                    <select
                      className="input"
                      value={editor.status}
                      onChange={(event) =>
                        setEditor({ ...editor, status: event.target.value })
                      }
                    >
                      {CRM_STATES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status] || status}
                        </option>
                      ))}
                    </select>
                  </label>
                  {config.fields.map((field) => (
                    <label
                      key={field}
                      className={
                        [
                          "body",
                          "terms",
                          "instructions",
                          "resolution",
                        ].includes(field)
                          ? "full"
                          : ""
                      }
                    >
                      {FIELD_LABELS[field] || field}
                      {["body", "terms", "instructions", "resolution"].includes(
                        field,
                      ) ? (
                        <textarea
                          className="input"
                          value={editor.data[field] || ""}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              data: {
                                ...editor.data,
                                [field]: event.target.value,
                              },
                            })
                          }
                        />
                      ) : (
                        <input
                          className="input"
                          value={editor.data[field] || ""}
                          type={
                            field.endsWith("At")
                              ? "datetime-local"
                              : field.endsWith("Url")
                                ? "url"
                                : "text"
                          }
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              data: {
                                ...editor.data,
                                [field]: event.target.value,
                              },
                            })
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="ops-actions">
                  <button className="btn btn-primary" disabled={busy}>
                    <Save size={17} />
                    Lưu
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditor(null)}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
            {decision && (
              <form className="ops-editor" onSubmit={review}>
                <h2>
                  {decision.action === "CLEARED"
                    ? "Gỡ mục hạn chế"
                    : "Xét duyệt"}
                </h2>
                {decision.kind === "case" && decision.action === "CLEAR" && (
                  <label>
                    Liên kết bằng chứng đã đối chiếu
                    <input
                      className="input"
                      type="url"
                      required
                      value={decision.evidenceUrl}
                      onChange={(event) =>
                        setDecision({
                          ...decision,
                          evidenceUrl: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
                {decision.kind === "kyc" && decision.action === "APPROVED" && (
                  <div className="ops-form-grid">
                    <p>Kiểm tra bộ ảnh và thông tin QR; nhập ngày hết hạn đọc trên thẻ. Không yêu cầu OCR. Hồ sơ không có QR cần khách bổ sung.</p>
                    <p>Họ tên và số căn cước được lấy từ QR đã lưu, không nhập lại.</p>
                    <label>Ngày hết hạn trên thẻ<input className="input" type="date" required value={decision.expiryDate||''} onChange={e=>setDecision({...decision,expiryDate:e.target.value})}/></label>
                    <label className="checkbox-row full">
                      <input
                        type="checkbox"
                        required
                        checked={decision.documentsConfirmed || false}
                        onChange={(event) =>
                          setDecision({
                            ...decision,
                            documentsConfirmed: event.target.checked,
                          })
                        }
                      />{" "}
                      Tôi xác nhận yêu cầu duyệt thông tin từ mã QR đã lưu.
                    </label>
                  </div>
                )}
                {decision.kind === "staff" && (
                  <div className="ops-form-grid">
                    <label>
                      Khách hàng / nhân viên
                      <select
                        className="input"
                        required
                        value={decision.id}
                        onChange={(event) =>
                          setDecision({ ...decision, id: event.target.value })
                        }
                      >
                        <option value="">Chọn tài khoản</option>
                        {overview.customers.map((customer) => (
                          <option value={customer.id} key={customer.id}>
                            {customer.name} · {customer.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Vai trò
                      <input
                        className="input"
                        required
                        value={decision.role}
                        onChange={(event) =>
                          setDecision({ ...decision, role: event.target.value })
                        }
                      />
                    </label>
                    <label className="full">
                      Quyền truy cập
                      <input
                        className="input"
                        required
                        value={decision.permissions.join(",")}
                        onChange={(event) =>
                          setDecision({
                            ...decision,
                            permissions: event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>
                        <input
                          type="checkbox"
                          checked={decision.enabled}
                          onChange={(event) =>
                            setDecision({
                              ...decision,
                              enabled: event.target.checked,
                            })
                          }
                        />
                        Cho phép truy cập CRM
                      </span>
                    </label>
                  </div>
                )}
                <label>
                  Lý do và bằng chứng đối chiếu
                  <textarea
                    className="input"
                    required={decision.action === "REJECTED" || decision.action === "DENIED"}
                    minLength={decision.action === "REJECTED" || decision.action === "DENIED" ? 1 : undefined}
                    placeholder={decision.action === "REJECTED" || decision.action === "DENIED" ? "Nêu lý do từ chối" : "Không cần nhập khi duyệt"}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <div className="ops-actions">
                  <button className="btn btn-primary" disabled={busy}>
                    Duyệt / từ chối
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDecision(null)}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
            {kycDetail && (
              <KycReview
                key={kycDetail.id}
                detail={kycDetail}
                onClose={() => setKycDetail(null)}
              />
            )}
            {editor?.caseDetails && (
              <section className="ops-editor">
                <h2>Bằng chứng & khiếu nại</h2>
                <p className="ops-case-note">
                  {editor.caseDetails.profiles?.name} ·{" "}
                  {editor.caseDetails.profiles?.phone} · Hồ sơ{" "}
                  {editor.caseDetails.id.slice(0, 8)}
                </p>
                {(editor.caseDetails.identifiers || []).map((identifier) => (
                  <div className="ops-detail" key={identifier.id}>
                    <strong>
                      {
                        {
                          PHONE: "Số điện thoại",
                          EMAIL: "Email",
                          BANK: "Tài khoản ngân hàng",
                          ZALO: "Zalo",
                        }[identifier.kind]
                      }{" "}
                      {identifier.masked_value} {identifier.bank_code}
                    </strong>
                    <p className="ops-case-note">
                      {identifier.checked_at
                        ? `Kiểm tra: ${new Date(identifier.checked_at).toLocaleString("vi-VN")}`
                        : "Chưa có kết quả tra cứu"}{" "}
                      · {identifier.status}
                    </p>
                    {(identifier.source_results || []).map((source, index) => (
                      <div className="ops-source-result" key={index}>
                        <strong>
                          {source.source === "checkscam"
                            ? "CheckScam"
                            : "Chống Lừa Đảo"}
                        </strong>
                        <span className="ops-badge">{source.status}</span>
                        <p>
                          {source.reason ||
                            "Có thông tin cần đối chiếu bằng chứng."}
                        </p>
                      </div>
                    ))}
                    <div className="ops-actions">
                      {Object.entries(identifier.links || {}).map(
                        ([source, url]) => (
                          <a
                            key={source}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                          >
                            <ArrowUpRight size={16} />
                            {source === "checkscam"
                              ? "Mở CheckScam"
                              : "Mở Chống Lừa Đảo"}
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                ))}
                <pre className="ops-detail">
                  {JSON.stringify(
                    {
                      evidence: editor.caseDetails.risk_evidence,
                      appeals: editor.caseDetails.risk_appeals,
                    },
                    null,
                    2,
                  )}
                </pre>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditor(null)}
                >
                  Đóng
                </button>
              </section>
            )}
            {editor?.conversationDetails && (
              <section className="ops-editor">
                <h2>Hội thoại hỗ trợ</h2>
                {editor.conversationDetails.support_messages
                  .sort(
                    (a, b) => new Date(a.created_at) - new Date(b.created_at),
                  )
                  .map((message, index) => (
                    <div key={index} className="ops-detail">
                      <strong>{message.role}</strong>
                      <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
                      <small>{message.model}</small>
                    </div>
                  ))}
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditor(null)}
                >
                  Đóng
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
