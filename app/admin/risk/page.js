"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  ShieldAlert,
  Leaf,
  MapPin,
  CheckCircle2,
  ArrowUpCircle,
  FileWarning,
  Hash,
} from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { getRiskLevelMeta } from "@/lib/admin-helpers";
import { formatDateTime, shortHash } from "@/lib/utils";

const LEVEL_ORDER = ["low", "medium", "high", "critical"];

function RiskAlertsTab() {
  const { state, actions } = useReloo();
  const { riskAlerts, orders, users } = state;
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolution, setResolution] = useState("");
  const [demandLetterOrder, setDemandLetterOrder] = useState(null);

  const getUser = (id) => users.find((u) => u.id === id);
  const getOrder = (id) => orders.find((o) => o.id === id);

  const active = riskAlerts.filter((a) => a.status === "active");
  const resolved = riskAlerts.filter((a) => a.status !== "active");

  const escalate = (alert) => {
    const idx = LEVEL_ORDER.indexOf(alert.level);
    const next = LEVEL_ORDER[Math.min(idx + 1, LEVEL_ORDER.length - 1)];
    actions.updateRiskAlert(alert.id, { level: next });
  };

  const confirmResolve = () => {
    if (!resolveTarget) return;
    actions.resolveRisk(resolveTarget.id, resolution || "Đã xử lý bởi Admin");
    setResolveTarget(null);
    setResolution("");
  };

  const overdueOrders = orders.filter((o) => o.status === "overdue" || (o.overdueHours && o.overdueHours > 0));

  return (
    <>
      <div className="panel mb-4">
        <div className="panel-header">
          <span className="panel-title flex items-center gap-2">
            <FileWarning size={16} /> Timeline xử lý quá hạn
          </span>
        </div>
        {overdueOrders.length === 0 ? (
          <EmptyState icon="CheckCircle2" title="Không có đơn quá hạn" description="Tất cả đơn hàng đang trong hạn." />
        ) : (
          <div className="flex flex-col gap-6">
            {overdueOrders.map((order) => {
              const hours = order.overdueHours || 0;
              const renter = getUser(order.renterId);
              const steps = [
                {
                  key: "0-6h",
                  title: "0–6 giờ: Nhắc nhở tự động",
                  desc: "Gửi SMS/App notification nhắc trả đồ, tính phụ phí trễ hạn.",
                  done: hours >= 0,
                  active: hours <= 6,
                },
                {
                  key: "6-24h",
                  title: "6–24 giờ: Cảnh báo & khóa tính năng",
                  desc: "Khóa đăng tin/đặt thuê mới, gọi điện xác minh, thông báo chủ đồ.",
                  done: hours > 6,
                  active: hours > 6 && hours <= 24,
                },
                {
                  key: ">24h",
                  title: ">24 giờ: Cưỡng chế thu hồi",
                  desc: "Gửi Demand Letter chính thức, trừ cọc, chuyển hồ sơ Risk/Pháp lý.",
                  done: hours > 24,
                  active: hours > 24,
                },
              ];
              return (
                <div key={order.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-sm">
                        {order.id}
                      </Link>
                      <span className="text-xs text-muted"> · {renter?.name} · Quá hạn {hours}h</span>
                    </div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setDemandLetterOrder(order)}>
                      <FileWarning size={14} /> Xem Demand Letter
                    </button>
                  </div>
                  <div className="enforce-timeline">
                    {steps.map((s) => (
                      <div
                        key={s.key}
                        className={`enforce-step${s.active ? " enforce-step--active" : s.done ? " enforce-step--done" : ""}`}
                      >
                        <div className="enforce-step-dot">
                          {s.done && !s.active ? <CheckCircle2 size={14} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>{s.key}</span>}
                        </div>
                        <div>
                          <div className="enforce-step__title">{s.title}</div>
                          <div className="enforce-step__desc">{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="divider" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel mb-4">
        <div className="panel-header">
          <span className="panel-title flex items-center gap-2">
            <ShieldAlert size={16} /> Cảnh báo đang hoạt động ({active.length})
          </span>
        </div>
        {active.length === 0 ? (
          <EmptyState icon="ShieldCheck" title="Không có cảnh báo" description="Hệ thống Risk Ops đang an toàn." />
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((alert) => {
              const levelMeta = getRiskLevelMeta(alert.level);
              const order = getOrder(alert.orderId);
              const user = getUser(alert.userId);
              return (
                <div key={alert.id} className="panel" style={{ borderLeft: `3px solid ${levelMeta.color}` }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{alert.title}</span>
                        <StatusPill label={levelMeta.label} color={levelMeta.color} />
                        <Badge variant="muted">{alert.type}</Badge>
                      </div>
                      <p className="text-sm text-muted mt-1" style={{ maxWidth: 560 }}>{alert.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                        {user && <span>Người dùng: {user.name}</span>}
                        {order && <Link href={`/admin/orders/${order.id}`} className="text-blue">Đơn: {order.id}</Link>}
                        {alert.gpsLastSeen && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {alert.gpsLastSeen}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => escalate(alert)}>
                        <ArrowUpCircle size={14} /> Nâng mức
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setResolveTarget(alert)}>
                        <CheckCircle2 size={14} /> Giải quyết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Đã xử lý ({resolved.length})</span>
        </div>
        {resolved.length === 0 ? (
          <span className="text-sm text-muted">Chưa có cảnh báo nào được xử lý.</span>
        ) : (
          <div className="table-wrap" style={{ boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Cảnh báo</th>
                  <th>Mức độ</th>
                  <th>Kết quả xử lý</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((a) => {
                  const meta = getRiskLevelMeta(a.level);
                  return (
                    <tr key={a.id}>
                      <td className="text-sm">{a.title}</td>
                      <td><StatusPill label={meta.label} color={meta.color} /></td>
                      <td className="text-sm text-muted">{a.resolution || "-"}</td>
                      <td className="text-sm text-muted">{a.resolvedAt ? formatDateTime(a.resolvedAt) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title="Giải quyết cảnh báo rủi ro"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setResolveTarget(null)}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmResolve}>
              Xác nhận giải quyết
            </button>
          </>
        }
      >
        <p className="text-sm text-muted mb-3">{resolveTarget?.title}</p>
        <div className="input-group">
          <label className="input-label">Ghi chú kết quả xử lý</label>
          <textarea
            className="textarea"
            rows={4}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Ví dụ: Admin đã liên hệ và xác nhận tài sản an toàn..."
          />
        </div>
      </Modal>

      <Modal
        open={!!demandLetterOrder}
        onClose={() => setDemandLetterOrder(null)}
        title="Xem trước Thư yêu cầu thu hồi (Demand Letter)"
        size="lg"
        footer={
          <button type="button" className="btn btn-primary" onClick={() => setDemandLetterOrder(null)}>
            Đóng
          </button>
        }
      >
        {demandLetterOrder && (
          <DemandLetterPreview order={demandLetterOrder} renter={getUser(demandLetterOrder.renterId)} />
        )}
      </Modal>
    </>
  );
}

function DemandLetterPreview({ order, renter }) {
  const penaltyRate = 2;
  const hourlyRate = order.dailyPrice / 24;
  const penalty = Math.round(hourlyRate * penaltyRate * (order.overdueHours || 0));

  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
      <p style={{ textAlign: "center", fontWeight: 700, fontFamily: "var(--font-display)" }}>
        THƯ YÊU CẦU THU HỒI TÀI SẢN
      </p>
      <p className="text-muted text-xs" style={{ textAlign: "center" }}>Số: DL-{order.id}</p>
      <div className="divider" />
      <p>Kính gửi: <strong>{renter?.name}</strong> ({renter?.phone})</p>
      <p>
        RELOO xin thông báo Quý khách đang <strong>quá hạn trả tài sản {order.overdueHours || 0} giờ</strong> theo
        đơn hàng <strong>{order.id}</strong>, thời hạn trả dự kiến {order.endDate ? new Date(order.endDate).toLocaleDateString("vi-VN") : "-"}.
      </p>
      <p>
        Theo Điều khoản sử dụng RELOO, khoản phạt quá hạn được tính theo công thức:
        <br />
        <span className="copyable-hash">P = (Giá thuê/giờ × 200%) × Số giờ trễ = <Money amount={penalty} /></span>
      </p>
      <p>
        Đề nghị Quý khách hoàn trả tài sản trong vòng <strong>24 giờ</strong> kể từ khi nhận thư này. Quá thời hạn,
        RELOO sẽ tiến hành:
      </p>
      <ul style={{ paddingLeft: 20 }}>
        <li>Trừ trực tiếp khoản phạt vào tiền cọc đã giữ</li>
        <li>Khóa tài khoản và đưa vào Danh sách đen hệ thống</li>
        <li>Chuyển hồ sơ cho đơn vị pháp lý/thu hồi đối tác</li>
      </ul>
      <p className="text-xs text-muted mt-3">
        Văn bản này được ký số tự động bởi hệ thống RELOO Risk Ops và lưu trữ Hash Blockchain để đối chiếu.
      </p>
    </div>
  );
}

function GreenAuditTab() {
  const { state } = useReloo();
  const { listings } = state;

  const sorted = useMemo(
    () => [...listings].sort((a, b) => (b.nftPassport?.auditCount || 0) - (a.nftPassport?.auditCount || 0)),
    [listings]
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-2">
          <Leaf size={16} /> Giám sát Green Audit theo tài sản
        </span>
      </div>
      <div className="table-wrap" style={{ boxShadow: "none" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Tài sản</th>
              <th>NFT Passport</th>
              <th>Số lần kiểm định</th>
              <th>Hash gần nhất</th>
              <th>Trust badges</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id}>
                <td className="text-sm font-semibold" style={{ maxWidth: 240 }}>{l.title}</td>
                <td className="text-xs text-muted">{l.nftPassport?.id}</td>
                <td>
                  <Badge variant={l.nftPassport?.auditCount > 8 ? "green" : "muted"}>
                    {l.nftPassport?.auditCount || 0} lượt
                  </Badge>
                </td>
                <td>
                  <span className="copyable-hash flex items-center gap-1">
                    <Hash size={11} /> {shortHash(l.nftPassport?.hash)}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {(l.trustBadges || []).map((b) => (
                      <Badge key={b} variant="blue">{b}</Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskOpsInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "audit" ? "audit" : "alerts";
  const [tab, setTab] = useState(initialTab);

  return (
    <div>
      <PageHeader
        title="Risk Ops Console"
        description="Giám sát rủi ro tài chính, hành vi bất thường Geofencing và tình trạng Green Audit trên toàn sàn."
      />

      <div className="tabs mb-4" style={{ maxWidth: 420 }}>
        <button type="button" className={`tab${tab === "alerts" ? " tab--active" : ""}`} onClick={() => setTab("alerts")}>
          <ShieldAlert size={14} /> Cảnh báo rủi ro
        </button>
        <button type="button" className={`tab${tab === "audit" ? " tab--active" : ""}`} onClick={() => setTab("audit")}>
          <Leaf size={14} /> Green Audit giám sát
        </button>
      </div>

      {tab === "alerts" ? <RiskAlertsTab /> : <GreenAuditTab />}
    </div>
  );
}

export default function RiskOpsPage() {
  return (
    <Suspense fallback={null}>
      <RiskOpsInner />
    </Suspense>
  );
}
