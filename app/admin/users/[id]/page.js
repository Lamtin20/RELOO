"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ShieldCheck, Ban, ShieldOff, Landmark, Package, ShoppingBag, Headset } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { TrustScore } from "@/components/ui/TrustScore";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Avatar } from "@/components/admin/Avatar";
import { StatusPill } from "@/components/admin/StatusPill";
import { getKycMeta, getOrderStatusMeta, getTicketStatusMeta } from "@/lib/admin-helpers";
import { BankLogo } from "@/components/bank/BankLogo";
import { formatDate, formatTimeAgo } from "@/lib/utils";

const ROLE_LABELS = {
  admin: "Quản trị viên",
  lender: "Chủ đồ",
  renter: "Người thuê",
  both: "Cả hai",
};

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { state, actions } = useReloo();
  const { users, listings, orders, tickets, customers, customerBankAccounts, customerAuditLogs } = state;

  const user = users.find((u) => u.id === id);
  const blacklist = state.settings?.blacklistedUserIds || [];
  const isBlacklisted = blacklist.includes(id);

  const ownedListings = useMemo(() => listings.filter((l) => l.ownerId === id), [listings, id]);
  const userOrders = useMemo(
    () => orders.filter((o) => o.renterId === id || o.lenderId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders, id]
  );
  const userTickets = useMemo(() => tickets.filter((t) => t.userId === id), [tickets, id]);
  const customer = useMemo(() => customers?.find((c) => c.customerId === id), [customers, id]);
  const bankAccounts = useMemo(
    () => (customerBankAccounts ?? []).filter((a) => a.customerId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [customerBankAccounts, id]
  );
  const primaryBank = bankAccounts.find((a) => a.isPrimary && a.status === "active");
  const auditLogs = useMemo(
    () => (customerAuditLogs ?? []).filter((l) => l.customerId === id).slice(0, 12),
    [customerAuditLogs, id]
  );

  if (!user) {
    return (
      <EmptyState
        title="Không tìm thấy người dùng"
        description="Người dùng này không tồn tại trong hệ thống."
        action={
          <Link href="/admin/users" className="btn btn-secondary">
            Về danh sách người dùng
          </Link>
        }
      />
    );
  }

  const kyc = getKycMeta(user.kycLevel);

  const toggleBlacklist = () => {
    const next = isBlacklisted ? blacklist.filter((uid) => uid !== id) : [...blacklist, id];
    actions.updateSettings({ blacklistedUserIds: next });
  };

  const upgradeKyc = () => {
    const order = ["L1", "L2", "L3"];
    const idx = order.indexOf(user.kycLevel);
    const next = order[Math.min(idx + 1, order.length - 1)];
    if (next !== user.kycLevel) actions.updateKyc(id, next);
  };

  return (
    <div>
      <PageHeader
        title={user.name}
        description={`${user.email} · ${user.phone}`}
        backHref="/admin/users"
        backLabel="Người dùng"
        actions={
          <>
            <button type="button" className="btn btn-secondary" disabled={user.kycLevel === "L3"} onClick={upgradeKyc}>
              <ShieldCheck size={16} /> Nâng cấp KYC
            </button>
            <button
              type="button"
              className={isBlacklisted ? "btn btn-secondary" : "btn btn-danger"}
              onClick={toggleBlacklist}
            >
              {isBlacklisted ? <ShieldOff size={16} /> : <Ban size={16} />}
              {isBlacklisted ? "Bỏ chặn" : "Đưa vào danh sách đen"}
            </button>
          </>
        }
      />

      {isBlacklisted && (
        <div className="panel mb-4" style={{ borderColor: "var(--danger)", background: "var(--danger-light)" }}>
          <span className="text-danger font-semibold text-sm">
            ⚠ Tài khoản này đang trong Danh sách đen - hạn chế đăng tin và đặt thuê mới.
          </span>
        </div>
      )}

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Hồ sơ CRM</span>
              <Badge variant="blue">{ROLE_LABELS[user.role] || user.role}</Badge>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <Avatar name={user.name} src={user.avatar} size={64} />
              <div>
                <div className="font-semibold" style={{ fontSize: 17 }}>{user.name}</div>
                <div className="text-sm text-muted">{user.address}</div>
                {user.bio && <div className="text-sm text-muted mt-1">{user.bio}</div>}
              </div>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Cấp KYC</span>
              <span className="detail-row__value">{kyc.code} - {kyc.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Hạn mức thuê tối đa</span>
              <span className="detail-row__value">
                {kyc.maxRentalValue === Infinity ? "Không giới hạn" : <Money amount={kyc.maxRentalValue} />}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Ngày sinh</span>
              <span className="detail-row__value">{customer?.dateOfBirth || user.dateOfBirth || "—"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">CCCD</span>
              <span className="detail-row__value">{user.nationalId ? `***${String(user.nationalId).slice(-4)}` : "—"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Mã khách hàng</span>
              <span className="detail-row__value">{customer?.customerId || id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Tài khoản ngân hàng</span>
              <span className="detail-row__value">
                {primaryBank ? (
                  <span className="admin-bank-inline">
                    <BankLogo bank={primaryBank} size="sm" />
                    <span>
                      {primaryBank.accountNumberMasked} · {primaryBank.bankShortName}
                    </span>
                  </span>
                ) : (
                  user.bankAccount || "Chưa liên kết"
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Ngày tham gia</span>
              <span className="detail-row__value">{formatDate(user.joinedAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Gói Pro Store</span>
              <span className="detail-row__value">
                {user.isPro ? <Badge variant="green">Đang hoạt động</Badge> : <Badge variant="muted">Không</Badge>}
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Tài khoản ngân hàng</span>
            </div>
            {bankAccounts.length === 0 ? (
              <span className="text-sm text-muted">Chưa có tài khoản ngân hàng được lưu.</span>
            ) : (
              <div className="admin-bank-history">
                {bankAccounts.map((acc) => (
                  <div key={acc.id} className="admin-bank-history__row">
                    <BankLogo bank={acc} size="sm" />
                    <div className="admin-bank-history__meta">
                      <strong>{acc.bankShortName}</strong>
                      <span>{acc.accountNumberMasked}</span>
                    </div>
                    <div className="admin-bank-history__status">
                      {acc.isPrimary && acc.status === "active" ? (
                        <Badge variant="green">Chính</Badge>
                      ) : (
                        <Badge variant="muted">{acc.status === "active" ? "Phụ" : "Ngưng"}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Nhật ký thay đổi</span>
            </div>
            {auditLogs.length === 0 ? (
              <span className="text-sm text-muted">Chưa có nhật ký.</span>
            ) : (
              <ul className="admin-audit-list">
                {auditLogs.map((log) => (
                  <li key={log.id}>
                    <strong>{log.action}</strong>
                    {log.newValueMasked && <span>{log.newValueMasked}</span>}
                    <em>{formatTimeAgo(log.createdAt)}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Package size={16} /> Tài sản đăng ({ownedListings.length})
              </span>
            </div>
            {ownedListings.length === 0 ? (
              <EmptyState title="Chưa có tài sản" description="Người dùng chưa đăng tin cho thuê." />
            ) : (
              <div className="flex flex-col gap-2">
                {ownedListings.map((l) => (
                  <div key={l.id} className="detail-row">
                    <span className="detail-row__label">{l.title}</span>
                    <span className="detail-row__value">
                      <Money amount={l.dailyPrice} />/ngày
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <ShoppingBag size={16} /> Lịch sử đơn hàng ({userOrders.length})
              </span>
            </div>
            {userOrders.length === 0 ? (
              <EmptyState title="Chưa có đơn hàng" description="Người dùng chưa tham gia giao dịch nào." />
            ) : (
              <div className="table-wrap" style={{ boxShadow: "none" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th>Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userOrders.map((o) => {
                      const meta = getOrderStatusMeta(o.status);
                      return (
                        <tr
                          key={o.id}
                          className="clickable-row"
                          onClick={() => router.push(`/admin/orders/${o.id}`)}
                        >
                          <td className="font-semibold">{o.id}</td>
                          <td className="text-sm text-muted">{o.renterId === id ? "Người thuê" : "Chủ đồ"}</td>
                          <td>
                            <StatusPill label={meta.label} color={meta.color} />
                          </td>
                          <td>
                            <Money amount={o.grandTotal} compact />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel flex flex-col items-center gap-3">
            <span className="panel-title">Trust Score</span>
            <TrustScore score={Math.round((user.trustScore / 1000) * 100)} size={120} />
            <div className="text-xs text-muted text-center">
              Điểm gốc: <strong>{user.trustScore}</strong> / 1000
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Landmark size={16} /> Thu nhập cho thuê
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Số dư cho thuê</span>
              <span className="detail-row__value">
                <Money amount={user.walletBalance} />
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Tổng thu nhập cho thuê</span>
              <span className="detail-row__value">
                <Money amount={user.totalEarnings} />
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Tổng lượt thuê</span>
              <span className="detail-row__value">{user.totalRentals}</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Chỉ số uy tín</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Lịch sử giao dịch</span>
              <span className="detail-row__value">{user.historyScore}/100</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Đánh giá phản hồi</span>
              <span className="detail-row__value">{user.feedbackScore}/100</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Vi phạm/quá hạn</span>
              <span className="detail-row__value" style={{ color: user.defaultsScore > 0 ? "var(--danger)" : undefined }}>
                {user.defaultsScore}/100
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Headset size={16} /> Tickets liên quan ({userTickets.length})
              </span>
            </div>
            {userTickets.length === 0 ? (
              <span className="text-sm text-muted">Không có ticket nào.</span>
            ) : (
              <div className="flex flex-col gap-2">
                {userTickets.map((t) => {
                  const meta = getTicketStatusMeta(t.status);
                  return (
                    <Link key={t.id} href={`/admin/tickets/${t.id}`} className="detail-row" style={{ textDecoration: "none" }}>
                      <span className="detail-row__label" style={{ color: "var(--ink)" }}>{t.subject}</span>
                      <StatusPill label={meta.label} color={meta.color} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
