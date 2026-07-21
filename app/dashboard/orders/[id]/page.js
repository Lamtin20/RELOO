"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Truck,
  ShieldAlert,
  Leaf,
  PackageCheck,
  CreditCard,
  XCircle,
  Shield,
} from "lucide-react";
import { useAuth, useOrders, useReloo } from "@/lib/store";
import { Money, EmptyState, Modal, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDateTime, shortHash } from "@/lib/utils";
import { FEE_RATES, RELOO_CARE_PLANS, DELIVERY_MODE, RENTAL_START_RULE } from "@/lib/constants";
import { getRelooCareCompensationCap } from "@/lib/reloo-care-policy";
import { formatGoshipAddress } from "@/lib/rent-draft";
import { canRenterCancelOrder } from "@/lib/orders";
import { isOrderEscrowHeld, getLenderPayout } from "@/lib/escrow-holds";
import { GoshipTrackingPanel } from "@/components/shipping/GoshipTrackingPanel";
import { formatDate } from "@/lib/utils";

const TIMELINE_STEPS = [
  { code: "pending", label: "Chờ thanh toán", icon: CreditCard },
  { code: "paid", label: "Đã thanh toán", icon: CheckCircle2 },
  { code: "audit_pickup", label: "Green Audit giao đi", icon: Leaf },
  { code: "shipping", label: "Đang vận chuyển", icon: Truck },
  { code: "in_use", label: "Đang sử dụng", icon: PackageCheck },
  { code: "audit_return", label: "Green Audit trả đồ", icon: Leaf },
  { code: "completed", label: "Hoàn tất", icon: CheckCircle2 },
];

const ALT_STATUSES = ["cancelled", "disputed", "overdue", "risk"];

function generateTrackingNumber() {
  const num = Math.floor(10000000 + Math.random() * 89999999);
  return `GHTK-VN${num}`;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, users } = useAuth();
  const { getOrderById, getOrderListing, updateOrderStatus } = useOrders();
  const { actions } = useReloo();

  const [claimOpen, setClaimOpen] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [claimSent, setClaimSent] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const order = getOrderById(id);
  const listing = useMemo(() => getOrderListing(order), [order, getOrderListing]);

  if (!user) return null;

  if (!order) {
    return (
      <div className="dashboard-page animate-fade-up">
        <EmptyState
          icon="FileQuestion"
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng này không tồn tại."
          action={
            <Link href="/dashboard/orders" className="btn btn-primary">
              Về danh sách đơn hàng
            </Link>
          }
        />
      </div>
    );
  }

  const isRenter = order.renterId === user.id;
  const isLender = order.lenderId === user.id;
  const counterpartyId = isRenter ? order.lenderId : order.renterId;
  const counterparty = users.find((u) => u.id === counterpartyId);

  const isAlt = ALT_STATUSES.includes(order.status);
  const currentStepIndex = TIMELINE_STEPS.findIndex((s) => s.code === order.status);

  const lenderPayout = Math.round(order.rentalTotal * FEE_RATES.lenderShare);
  const carePlan = RELOO_CARE_PLANS[order.relooCarePlan];
  const careCompensationCap = order.relooCarePlan
    ? getRelooCareCompensationCap(order.relooCarePlan)
    : 0;

  const isLenderDelivery = order.deliveryMode === DELIVERY_MODE.LENDER.code;

  const handlePay = () => updateOrderStatus(order.id, "paid");

  const handleCancel = () => {
    updateOrderStatus(order.id, "cancelled", {
      cancelReason: isRenter ? "Người thuê hủy đơn (chủ đồ chưa xác nhận)" : "Chủ đồ hủy đơn",
    });
    setCancelConfirmOpen(false);
  };

  const renterCanCancel = isRenter && canRenterCancelOrder(order);
  const escrowHeld = isOrderEscrowHeld(order);
  const escrowAmount = isRenter ? order.grandTotal : getLenderPayout(order);

  const handleConfirmShipping = () =>
    updateOrderStatus(order.id, "shipping", {
      trackingNumber: generateTrackingNumber(),
      shippingProvider: order.shippingCarrier ?? order.shippingProvider ?? "Goship",
      goshipOrderId: order.id,
    });

  const handleLenderConfirmDelivery = () => updateOrderStatus(order.id, "in_use");

  const handleConfirmReceive = () => updateOrderStatus(order.id, "in_use");

  const handleCompleteReturn = () => updateOrderStatus(order.id, "completed");

  const handleClaimSubmit = () => {
    actions.addTicket({
      subject: `Yêu cầu bồi thường Reloo Care - ${order.id}`,
      description: claimText || "Yêu cầu bồi thường qua Gói An Tâm Reloo Care",
      userId: user.id,
      orderId: order.id,
      category: "Reloo Care",
      priority: "high",
    });
    setClaimSent(true);
  };

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-order-header panel">
        <div
          className="dashboard-order-header__image"
          style={{
            backgroundImage: listing?.images?.[0]
              ? `url(${listing.images[0]})`
              : undefined,
          }}
        />
        <div className="dashboard-order-header__info">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg">{listing?.title ?? order.id}</h1>
            <StatusBadge status={order.status} />
            {escrowHeld && (
              <Badge variant="blue" icon={Shield}>
                Đang giữ tại ký quỹ
              </Badge>
            )}
          </div>
          <p className="text-muted text-sm mt-1">
            Mã đơn: {order.id} · {isRenter ? "Bạn đang thuê từ" : "Bạn đang cho thuê tới"}{" "}
            <strong>{counterparty?.name ?? "-"}</strong>
          </p>
          <p className="text-xs text-muted mt-1">
            {order.rentalStartAt
              ? `Bắt đầu thuê thực tế: ${formatDateTime(order.rentalStartAt)}`
              : order.estimatedRentalStartDate
                ? `Dự kiến bắt đầu thuê: ${formatDate(order.estimatedRentalStartDate)}`
                : order.startDate
                  ? formatDateTime(order.startDate)
                  : "Chưa xác định"}{" "}
            -{" "}
            {order.endDate ? formatDateTime(order.endDate) : "Chưa xác định"} ·{" "}
            {order.days} ngày
          </p>
        </div>
        <div className="dashboard-order-header__total">
          <span className="text-xs text-muted">Tổng thanh toán</span>
          <Money amount={order.grandTotal} className="text-lg font-semibold" />
        </div>
      </div>

      {escrowHeld && (
        <div className="escrow-order-banner panel mt-6">
          <Shield size={18} />
          <div className="escrow-order-banner__main">
            <strong>
              {isRenter
                ? "RELOO đang tạm giữ thanh toán của bạn"
                : "Thu nhập cho thuê đang chờ giải ngân"}
            </strong>
            <p>
              {isRenter ? (
                <>
                  Tổng <Money amount={escrowAmount} /> (cọc{" "}
                  <Money amount={order.deposit ?? 0} /> + thuê &amp; phí{" "}
                  <Money amount={Math.max(0, (order.grandTotal ?? 0) - (order.deposit ?? 0))} />
                  ) được giữ an toàn tại tài khoản ký quỹ cho đến khi trả đồ và đối chiếu xong.
                </>
              ) : (
                <>
                  <Money amount={escrowAmount} /> sẽ chuyển vào số dư cho thuê sau khi đơn hoàn tất
                  và kiểm tra tình trạng đạt yêu cầu.
                </>
              )}
            </p>
          </div>
          <Link href="/dashboard/wallet#escrow" className="escrow-order-banner__link">
            Theo dõi ký quỹ
          </Link>
        </div>
      )}

      {isAlt && (
        <div className="dashboard-alert-banner mt-6">
          <ShieldAlert size={18} />
          <div>
            <strong>
              {order.status === "cancelled" && "Đơn hàng đã bị hủy"}
              {order.status === "disputed" && "Đơn hàng đang trong tranh chấp"}
              {order.status === "overdue" && "Đơn hàng quá hạn trả"}
              {order.status === "risk" && "Đơn hàng có cảnh báo rủi ro"}
            </strong>
            <p className="text-sm mt-1">
              {order.cancelReason || order.disputeReason || "Vui lòng liên hệ CSKH RELOO để được hỗ trợ xử lý."}
            </p>
          </div>
        </div>
      )}

      {!isAlt && (
        <div className="panel mt-6">
          <div className="panel-header">
            <h2 className="panel-title">Tiến trình đơn hàng</h2>
          </div>
          <div className="dashboard-timeline">
            {TIMELINE_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const done = idx < currentStepIndex;
              const active = idx === currentStepIndex;
              return (
                <div
                  key={step.code}
                  className={`dashboard-timeline__step ${
                    done ? "dashboard-timeline__step--done" : ""
                  } ${active ? "dashboard-timeline__step--active" : ""}`.trim()}
                >
                  <div className="dashboard-timeline__dot">
                    {done ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                  </div>
                  <span className="text-xs">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isRenter && order.status === "shipping" && !isLenderDelivery && (
        <GoshipTrackingPanel
          orderId={order.goshipOrderId ?? order.id}
          orderStatus={order.status}
          fallbackTrackingNumber={order.trackingNumber}
        />
      )}

      <div className="panel mt-6 order-rental-start-panel">
        <div className="panel-header">
          <h2 className="panel-title">Mốc bắt đầu tính thuê</h2>
        </div>
        <div className="order-rental-start-panel__body">
          <p className="text-sm">
            <strong>Hình thức giao:</strong>{" "}
            {isLenderDelivery ? DELIVERY_MODE.LENDER.label : DELIVERY_MODE.SHIPPER.label}
          </p>
          <p className="text-sm text-muted mt-1">
            {order.rentalStartRule === RENTAL_START_RULE.ON_LENDER_CONFIRM
              ? "Thời gian thuê bắt đầu khi chủ đồ xác nhận giao hàng thành công."
              : "Thời gian thuê bắt đầu khi người thuê nhận được hàng (cộng thời gian vận chuyển)."}
          </p>
          {order.estimatedShipByDate && !isLenderDelivery && (
            <p className="text-sm mt-2">
              Cần gửi hàng trước: <strong>{formatDate(order.estimatedShipByDate)}</strong>
              {order.estimatedTransitDays
                ? ` · Vận chuyển ~${order.estimatedTransitDays} ngày`
                : ""}
            </p>
          )}
          {order.rentalStartAt ? (
            <p className="text-sm mt-2 text-green">
              Đã bắt đầu tính thuê: <strong>{formatDateTime(order.rentalStartAt)}</strong>
            </p>
          ) : order.estimatedRentalStartDate ? (
            <p className="text-sm mt-2">
              Dự kiến bắt đầu: <strong>{formatDate(order.estimatedRentalStartDate)}</strong>
            </p>
          ) : null}
        </div>
      </div>

      <div className="dashboard-grid-2 mt-6">
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Hành động</h2>
          </div>
          <div className="dashboard-action-list">
            {isRenter && order.status === "pending" && (
              <button className="btn btn-primary w-full" onClick={handlePay}>
                <CreditCard size={16} /> Thanh toán ngay (Mock PayOS)
              </button>
            )}

            {isLender && order.status === "paid" && (
              <Link href={`/dashboard/audit/${order.id}`} className="btn btn-primary w-full">
                <Leaf size={16} /> Thực hiện Green Audit giao đi
              </Link>
            )}

            {isLender && order.status === "audit_pickup" && isLenderDelivery && (
              <button className="btn btn-primary w-full" onClick={handleLenderConfirmDelivery}>
                <PackageCheck size={16} /> Xác nhận giao hàng thành công
              </button>
            )}

            {isLender && order.status === "audit_pickup" && !isLenderDelivery && (
              <button className="btn btn-primary w-full" onClick={handleConfirmShipping}>
                <Truck size={16} /> Xác nhận đã gửi vận chuyển
              </button>
            )}

            {isRenter && order.status === "shipping" && !isLenderDelivery && (
              <button className="btn btn-primary w-full" onClick={handleConfirmReceive}>
                <PackageCheck size={16} /> Xác nhận đã nhận hàng
              </button>
            )}

            {isRenter && order.status === "in_use" && (
              <Link href={`/dashboard/audit/${order.id}`} className="btn btn-primary w-full">
                <Leaf size={16} /> Bắt đầu Green Audit trả đồ
              </Link>
            )}

            {isLender && order.status === "audit_return" && (
              <button className="btn btn-primary w-full" onClick={handleCompleteReturn}>
                <CheckCircle2 size={16} /> Xác nhận nhận lại & Hoàn tất
              </button>
            )}

            {(order.relooCarePlan) &&
              ["in_use", "audit_return", "completed"].includes(order.status) && (
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => setClaimOpen(true)}
                >
                  <ShieldAlert size={16} /> Yêu cầu bồi thường Reloo Care
                </button>
              )}

            {order.status === "pending" && (
              <button className="btn btn-ghost w-full" onClick={handleCancel}>
                <XCircle size={16} /> Hủy đơn hàng
              </button>
            )}

            {renterCanCancel && (
              <button
                className="btn btn-ghost w-full"
                onClick={() => setCancelConfirmOpen(true)}
              >
                <XCircle size={16} /> Hủy yêu cầu thuê
              </button>
            )}

            {!["pending"].includes(order.status) &&
              !renterCanCancel &&
              !isAlt &&
              !(isLender && ["paid", "audit_pickup", "audit_return"].includes(order.status)) &&
              !(isRenter && ["shipping", "in_use"].includes(order.status)) && (
                <p className="text-sm text-muted">
                  Đang chờ {isRenter ? "chủ đồ" : "người thuê"} thực hiện bước tiếp theo.
                </p>
              )}
          </div>

          <div className="dashboard-tracking mt-6">
            <h3 className="text-sm font-semibold mb-2">Địa chỉ vận chuyển</h3>
            {order.pickupAddress && (
              <div className="dashboard-shipping-addr mb-3">
                <span className="text-xs text-muted">Lấy hàng</span>
                <p className="text-sm">{formatGoshipAddress(order.pickupAddress)}</p>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="dashboard-shipping-addr mb-3">
                <span className="text-xs text-muted">Giao hàng</span>
                <p className="text-sm">{formatGoshipAddress(order.deliveryAddress)}</p>
              </div>
            )}
            <h3 className="text-sm font-semibold mb-2 mt-4">Mã vận đơn</h3>
            {order.trackingNumber ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{order.shippingProvider}</span>
                <Badge variant="blue">{order.trackingNumber}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted">Chưa có mã vận đơn</p>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Chi tiết thanh toán</h2>
          </div>
          <div className="dashboard-finance-rows">
            <div className="dashboard-finance-row">
              <span className="text-muted">Giá thuê ({order.days} ngày)</span>
              <Money amount={order.rentalTotal} />
            </div>
            <div className="dashboard-finance-row">
              <span className="text-muted">Phí sàn RELOO (15%)</span>
              <Money amount={-order.platformFee} className="text-danger" />
            </div>
            {order.relooCareFee > 0 && (
              <div className="dashboard-finance-row">
                <span className="text-muted">
                  Gói An Tâm ({carePlan?.name ?? order.relooCarePlan})
                </span>
                <Money amount={order.relooCareFee} />
              </div>
            )}
            {order.shippingFee > 0 && (
              <div className="dashboard-finance-row">
                <span className="text-muted">Phí vận chuyển</span>
                <Money amount={order.shippingFee} />
              </div>
            )}
            {order.deposit > 0 && (
              <div className="dashboard-finance-row">
                <span className="text-muted">Tiền cọc (giữ tạm ký quỹ)</span>
                <Money amount={order.deposit} />
              </div>
            )}
            <div className="dashboard-finance-row dashboard-finance-row--total">
              <span>Tổng thanh toán</span>
              <Money amount={order.grandTotal} />
            </div>
          </div>

          <div className="dashboard-split mt-4">
            <span className="text-xs text-muted">Phân chia doanh thu thuê</span>
            <div className="dashboard-split__bar">
              <div className="dashboard-split__bar-lender" style={{ width: "85%" }} />
              <div className="dashboard-split__bar-platform" style={{ width: "15%" }} />
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span>
                Chủ đồ nhận <strong className="text-green">85%</strong> ={" "}
                <Money amount={lenderPayout} />
              </span>
              <span>
                RELOO <strong className="text-blue">15%</strong> ={" "}
                <Money amount={order.platformFee} />
              </span>
            </div>
          </div>

          <div className="dashboard-audit-status mt-6">
            <h3 className="text-sm font-semibold mb-2">Trạng thái Green Audit</h3>
            <div className="dashboard-audit-status__row">
              <span className="text-sm">Giao đi (Pickup)</span>
              {order.auditPickupHash ? (
                <Badge variant="green" icon={CheckCircle2}>
                  {shortHash(order.auditPickupHash)}
                </Badge>
              ) : (
                <Badge variant="muted" icon={Circle}>
                  Chưa thực hiện
                </Badge>
              )}
            </div>
            <div className="dashboard-audit-status__row">
              <span className="text-sm">Trả đồ (Return)</span>
              {order.auditReturnHash ? (
                <Badge variant="green" icon={CheckCircle2}>
                  {shortHash(order.auditReturnHash)}
                </Badge>
              ) : (
                <Badge variant="muted" icon={Circle}>
                  Chưa thực hiện
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={claimOpen}
        onClose={() => {
          setClaimOpen(false);
          setClaimSent(false);
          setClaimText("");
        }}
        title="Yêu cầu bồi thường Reloo Care"
        footer={
          !claimSent && (
            <>
              <button className="btn btn-ghost" onClick={() => setClaimOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleClaimSubmit}>
                Gửi yêu cầu
              </button>
            </>
          )
        }
      >
        {claimSent ? (
          <div className="flex flex-col items-center text-center gap-2 py-4">
            <CheckCircle2 size={32} className="text-green" />
            <p className="font-semibold">Đã gửi yêu cầu bồi thường!</p>
            <p className="text-sm text-muted">
              Đội ngũ Reloo Care sẽ xử lý trong{" "}
              {carePlan?.slaHours ?? 48} giờ theo gói {carePlan?.name ?? "An Tâm"}.
            </p>
          </div>
        ) : (
          <div className="input-group">
            <p className="text-sm text-muted">
              Mô tả sự cố hư hỏng để RELOO đối soát với dữ liệu Green Audit đã ghi
              nhận trên Blockchain.
            </p>
            <textarea
              className="textarea"
              rows={4}
              placeholder="VD: Bánh xe bị xước khi nhận hàng..."
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
            />
            {carePlan && (
              <span className="input-hint">
                Gói {carePlan.name}: bồi thường tối đa{" "}
                {Math.round(carePlan.compensationRate * 100)}% thiệt hại, trần cứng{" "}
                {careCompensationCap.toLocaleString("vi-VN")}₫ (Rule Engine), xử lý trong{" "}
                {carePlan.slaHours}h
              </span>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title="Hủy yêu cầu thuê?"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCancelConfirmOpen(false)}>
              Không hủy
            </button>
            <button className="btn btn-danger" onClick={handleCancel}>
              Xác nhận hủy
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Bạn chỉ có thể hủy khi chủ đồ <strong>chưa xác nhận đơn</strong>. Sau khi chủ đồ xác
          nhận và gửi hàng, đơn sẽ không thể hủy. Tiền đã thanh toán sẽ được hoàn theo chính sách
          RELOO (mock).
        </p>
      </Modal>
    </div>
  );
}
