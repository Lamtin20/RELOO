"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Info,
  ShieldCheck,
  Landmark,
  Clock,
  CheckCircle2,
  LogIn,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { EmptyState, Money } from "@/components/ui";
import { useAuth, useListings, useOrders } from "@/lib/store";
import { useTrustPlatform } from "@/lib/hooks/useTrustPlatform";
import { DECISION_OUTCOME } from "@/lib/trust-platform";
import { RELOO_CARE_PLANS, DELIVERY_MODE } from "@/lib/constants";
import { calcOrderTotal, formatDate, formatVND } from "@/lib/utils";
import { RentalPaymentSummary } from "@/components/checkout/RentalPaymentSummary";
import { RentalStartEstimate } from "@/components/rent/RentalStartEstimate";
import { loadRentDraft, formatGoshipAddress } from "@/lib/rent-draft";

const DEFAULT_SHIPPING_FEE = 35_000;
const PAY_WINDOW_SECONDS = 15 * 60;

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffDays(start, end) {
  if (!start || !end) return 0;
  return Math.max(1, Math.round((end - start) / 86400000));
}

function FakeQr({ seed = "" }) {
  const cells = useMemo(() => {
    let h = 7;
    for (let i = 0; i < seed.length; i += 1) {
      h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return Array.from({ length: 121 }).map(() => {
      h = (h * 1103515245 + 12345) >>> 0;
      return (h >> 16) % 3 === 0;
    });
  }, [seed]);

  return (
    <div className="fake-qr" aria-hidden="true">
      {cells.map((filled, i) => (
        <span key={i} className={filled ? "fake-qr__cell fake-qr__cell--on" : "fake-qr__cell"} />
      ))}
      <div className="fake-qr__eye fake-qr__eye--tl" />
      <div className="fake-qr__eye fake-qr__eye--tr" />
      <div className="fake-qr__eye fake-qr__eye--bl" />
    </div>
  );
}

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, isAuthenticated, switchUser } = useAuth();
  const { getListingById } = useListings();
  const { orders, createOrder, updateOrderStatus, lastRentalDecision } = useOrders({ renterId: user?.id });
  const { identityProfile, evaluateRental, logBehavior } = useTrustPlatform();
  const [payError, setPayError] = useState(null);

  const listing = getListingById(params.id);

  const startDate = parseDate(searchParams.get("start"));
  const endDate = parseDate(searchParams.get("end"));
  const careParam = searchParams.get("care") || "basic";
  const care =
    careParam === "premium" ? "premium" : careParam === "none" ? "none" : "basic";
  const days = diffDays(startDate, endDate);

  const shippingParam = searchParams.get("shipping");
  const shippingFee = shippingParam ? Number(shippingParam) : DEFAULT_SHIPPING_FEE;
  const rateId = searchParams.get("rateId") || null;
  const carrier = searchParams.get("carrier") || null;

  const rentDraft = useMemo(
    () => (listing ? loadRentDraft(listing.id) : null),
    [listing?.id],
  );

  const deliveryMode =
    rentDraft?.deliveryMode ?? searchParams.get("delivery") ?? DELIVERY_MODE.SHIPPER.code;
  const isShipperDelivery = deliveryMode === DELIVERY_MODE.SHIPPER.code;
  const transitDays = rentDraft?.estimatedTransitDays ?? 0;

  const [isPaying, setIsPaying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PAY_WINDOW_SECONDS);
  const prevOrderCountRef = useRef(orders.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPaying) return;
    if (lastRentalDecision?.outcome === DECISION_OUTCOME.REJECT ||
        lastRentalDecision?.outcome === DECISION_OUTCOME.NEED_MORE_VERIFICATION) {
      setIsPaying(false);
      setPayError(lastRentalDecision.reasons?.join(" ") ?? "Không thể tạo giao dịch thuê.");
      return;
    }
    if (orders.length > prevOrderCountRef.current && listing) {
      const newOrder = orders.find((o) => o.listingId === listing.id && o.status === "pending");
      if (newOrder) {
        logBehavior({
          action: "Payment",
          module: "checkout",
          screen: `/checkout/${listing.id}`,
          transactionId: newOrder.id,
          scores: {
            trust: lastRentalDecision?.scores?.trust ?? user?.trustScore,
            risk: lastRentalDecision?.scores?.risk,
            fraud: lastRentalDecision?.scores?.fraud,
          },
          decisionId: newOrder.decisionId,
        });
        updateOrderStatus(newOrder.id, "paid");
        setIsPaying(false);
        router.push("/dashboard/orders");
      }
    }
    prevOrderCountRef.current = orders.length;
  }, [orders, isPaying, listing, updateOrderStatus, router, lastRentalDecision, logBehavior, user?.trustScore]);

  const pricing = useMemo(() => {
    if (!listing || !days) return null;
    return calcOrderTotal({
      dailyPrice: listing.dailyPrice,
      days,
      marketValue: listing.marketValue,
      trustScore: user?.trustScore ?? 0,
      relooCarePlan: care,
      shippingFee: Number.isFinite(shippingFee) ? shippingFee : DEFAULT_SHIPPING_FEE,
      renterUser: user,
    });
  }, [listing, days, user, care, shippingFee]);

  if (!listing) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="PackageX"
            title="Không tìm thấy sản phẩm"
            description="Sản phẩm bạn muốn thuê không tồn tại hoặc đã bị gỡ."
            action={
              <button className="btn btn-primary" onClick={() => router.push("/explore")}>
                Quay lại khám phá
              </button>
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="LogIn"
            title="Vui lòng đăng nhập để tiếp tục"
            description="Bạn cần đăng nhập để đặt thuê sản phẩm này và tạo đơn hàng trên RELOO."
            action={
              <button className="btn btn-primary" onClick={() => switchUser("user_lan")}>
                <LogIn size={15} /> Đăng nhập với Lan Trần (Demo)
              </button>
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  if (!startDate || !endDate) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="CalendarX"
            title="Thiếu thông tin ngày thuê"
            description="Vui lòng chọn ngày nhận và trả đồ trước khi thanh toán."
            action={
              <Link href={`/rent/${listing.id}`} className="btn btn-primary">
                Chọn lại ngày thuê
              </Link>
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  function handleConfirmPayment() {
    if (!user || isPaying) return;
    setPayError(null);

    const preview = evaluateRental({
      listingId: listing.id,
      renterId: user.id,
      days,
      relooCarePlan: care,
    });

    if (
      preview.outcome === DECISION_OUTCOME.REJECT ||
      preview.outcome === DECISION_OUTCOME.NEED_MORE_VERIFICATION
    ) {
      setPayError(preview.reasons?.join(" ") ?? "Identity chưa VERIFIED hoặc vi phạm Rule CRITICAL.");
      return;
    }

    setIsPaying(true);
    createOrder({
      listingId: listing.id,
      renterId: user.id,
      days,
      relooCarePlan: care,
      shippingFee: Number.isFinite(shippingFee) ? shippingFee : DEFAULT_SHIPPING_FEE,
      shippingRateId: rateId ?? rentDraft?.selectedRate?.id ?? null,
      shippingCarrier: carrier ?? rentDraft?.selectedRate?.carrier_name ?? null,
      shippingProvider: carrier ?? rentDraft?.selectedRate?.carrier_name ?? null,
      pickupAddress: rentDraft?.pickupAddress ?? null,
      deliveryAddress: rentDraft?.deliveryAddress ?? null,
      cccdHandoverRequired: rentDraft?.cccdHandoverRequired !== false,
      deliveryMode: rentDraft?.deliveryMode ?? searchParams.get("delivery") ?? "shipper",
      rentalStartRule: rentDraft?.rentalStartRule ?? "on_receive",
      estimatedTransitDays: rentDraft?.estimatedTransitDays ?? null,
      estimatedShipByDate: rentDraft?.estimatedShipByDate ?? null,
      estimatedRentalStartDate: rentDraft?.estimatedRentalStartDate ?? startDate.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      notes: rentDraft?.selectedRate
        ? `Goship · ${rentDraft.selectedRate.carrier_name} · ${rentDraft.selectedRate.service}`
        : "",
    });
  }

  const carePlanInfo = care !== "none" ? RELOO_CARE_PLANS[care] : null;
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <MarketplaceShell>
      <div className="container checkout-page">
        <Link href={`/rent/${listing.id}`} className="checkout-page__back">
          <ArrowLeft size={14} /> Quay lại đặt thuê
        </Link>
        <h1>Xác nhận đặt thuê</h1>

        {rentDraft && (
          <div className="panel checkout-shipping-panel">
            <h3 className="panel-title">
              {isShipperDelivery ? "Vận chuyển Goship" : "Chủ đồ tự giao"}
            </h3>
            {isShipperDelivery && carrier && (
              <p className="text-sm">
                <strong>{carrier}</strong>
                {rentDraft.selectedRate?.service ? ` · ${rentDraft.selectedRate.service}` : ""}
              </p>
            )}
            {!isShipperDelivery && (
              <p className="text-sm text-muted">
                Chủ đồ sẽ giao trực tiếp. Thời gian thuê bắt đầu khi chủ đồ xác nhận giao hàng thành công.
              </p>
            )}
            <div className="checkout-shipping-panel__addrs">
              <div>
                <span className="text-muted text-xs">Lấy hàng</span>
                <p>{formatGoshipAddress(rentDraft.pickupAddress)}</p>
                <p className="text-sm">
                  {rentDraft.pickupAddress?.name} · {rentDraft.pickupAddress?.phone}
                </p>
              </div>
              <div>
                <span className="text-muted text-xs">Giao hàng</span>
                <p>{formatGoshipAddress(rentDraft.deliveryAddress)}</p>
                <p className="text-sm">
                  {rentDraft.deliveryAddress?.name} · {rentDraft.deliveryAddress?.phone}
                </p>
              </div>
            </div>
            {isShipperDelivery && (
              <p className="checkout-shipping-panel__cccd text-sm text-muted">
                Giao hàng khi đối chiếu <strong>CCCD gốc</strong> trực tiếp với thông tin eKYC RELOO.
              </p>
            )}
            <RentalStartEstimate
              deliveryMode={deliveryMode}
              desiredStartDate={startDate}
              transitDays={transitDays}
            />
          </div>
        )}

        {identityProfile && identityProfile.status !== "VERIFIED" && (
          <div className="panel checkout-trust-alert" role="alert">
            <ShieldCheck size={18} />
            <div>
              <strong>Chưa đủ điều kiện thuê (Rule R003)</strong>
              <p className="text-sm text-muted">
                Bạn cần hoàn tất eKYC: Email, SĐT, CCCD, OCR và Face Match trước khi tạo giao dịch.
              </p>
              <Link href="/dashboard/kyc/verify" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                Xác minh danh tính ngay
              </Link>
            </div>
          </div>
        )}

        {payError && (
          <div className="panel checkout-trust-error" role="alert">
            <Info size={18} />
            <div>
              <strong>Không thể tạo giao dịch thuê</strong>
              <p className="text-sm">{payError}</p>
            </div>
          </div>
        )}

        <div className="checkout-grid">
          <div className="panel order-summary-panel">
            <div className="checkout-item-preview">
              <img src={listing.images?.[0]} alt={listing.title} />
              <div>
                <div className="checkout-item-preview__title">{listing.title}</div>
                <div className="checkout-item-preview__dates">
                  {formatDate(startDate)} → {formatDate(endDate)} · {days} ngày
                </div>
              </div>
            </div>

            <h3 className="panel-title">Chi tiết thanh toán</h3>

            {pricing && (
              <RentalPaymentSummary
                days={days}
                dailyPrice={listing.dailyPrice}
                rentalTotal={pricing.total}
                rentalSubtotal={pricing.subtotal}
                rentalDiscount={pricing.discount}
                discountRate={pricing.discountRate}
                deposit={pricing.deposit}
                relooCareFee={pricing.relooCareFee}
                relooCareLabel={
                  carePlanInfo ? `Gói An Tâm · ${carePlanInfo.name}` : "Gói An Tâm Reloo Care"
                }
                shippingFee={pricing.shippingFee}
                grandTotal={pricing.grandTotal}
                showCare={care !== "none"}
              />
            )}
          </div>

          <div className="panel payment-panel">
            <span className="flex items-center gap-2 font-semibold">
              <Landmark size={18} className="text-blue" /> Thanh toán qua PayOS · VietQR
            </span>

            <FakeQr seed={listing.id} />

            <span className="payment-panel__amount">
              {pricing ? formatVND(pricing.grandTotal) : ""}
            </span>

            <div className="payment-panel__bank-info">
              <div className="payment-panel__bank-row">
                <span className="text-muted">Ngân hàng</span>
                <strong>MB Bank</strong>
              </div>
              <div className="payment-panel__bank-row">
                <span className="text-muted">Số tài khoản</span>
                <strong>RELOO ESCROW 9999999999</strong>
              </div>
              <div className="payment-panel__bank-row">
                <span className="text-muted">Nội dung CK</span>
                <strong>RL DEMO {listing.id.slice(-6).toUpperCase()}</strong>
              </div>
            </div>

            <span className="payment-panel__timer">
              <Clock size={14} /> Hết hạn thanh toán trong {minutes}:{seconds}
            </span>

            <button
              type="button"
              className="btn btn-primary btn-lg w-full"
              disabled={isPaying}
              onClick={handleConfirmPayment}
            >
              {isPaying ? (
                "Đang xử lý..."
              ) : (
                <>
                  <CheckCircle2 size={16} /> Xác nhận đã thanh toán
                </>
              )}
            </button>

            <span className="text-xs text-muted flex items-center gap-1">
              <ShieldCheck size={13} /> Giao dịch được bảo chứng bởi tài khoản ký quỹ RELOO
            </span>
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}
