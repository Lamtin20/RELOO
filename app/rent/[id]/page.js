"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  IdCard,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { EmptyState, Money } from "@/components/ui";
import { DateRangeCalendar } from "@/components/booking/DateRangeCalendar";
import { RentalPaymentSummary } from "@/components/checkout/RentalPaymentSummary";
import { RelooCarePlanDetailModal } from "@/components/care/RelooCarePlanDetailModal";
import { ReadonlyAddressCard } from "@/components/shipping/ReadonlyAddressCard";
import { ShippingRatePicker } from "@/components/shipping/ShippingRatePicker";
import { RentWaitlistForm } from "@/components/rent/RentWaitlistForm";
import { RentalStartEstimate } from "@/components/rent/RentalStartEstimate";
import { DeliveryModePicker } from "@/components/rent/DeliveryModePicker";
import { RentalOperationSteps } from "@/components/rent/RentalOperationSteps";
import { DELIVERY_MODE, LISTING_STATUS } from "@/lib/constants";
import {
  HANDOVER_DELIVERY_RULES,
  HANDOVER_IDENTITY_REQUIREMENTS,
} from "@/lib/rental-operation-policy";
import {
  buildListingAvailability,
  getRentalStartRule,
  getWaitlistForListing,
  parseTransitDaysFromRate,
  userHasWaitlist,
  estimateShipByDate,
} from "@/lib/rental-availability";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { buildListingPickupAddress } from "@/lib/goship/listing-pickup";
import { getRelooCarePlanDetail } from "@/lib/reloo-care";
import {
  emptyGoshipAddress,
  formatGoshipAddress,
  saveRentDraft,
  validateGoshipAddress,
} from "@/lib/rent-draft";
import { calcOrderTotal } from "@/lib/utils";

const DEFAULT_PARCEL_WEIGHT = 800;

async function resolveGoshipCodes({ provinceName, wardName, street }) {
  const res = await fetch("/api/goship/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provinceName, wardName, street }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Không đồng bộ được mã Goship");
  return json.data;
}

export default function RentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { state, actions } = useReloo();
  const { getListingById, getOwner, dbLoading } = useListings();

  const listing = getListingById(params.id);
  const owner = listing ? getOwner(listing.ownerId) : null;

  const availability = useMemo(
    () => (listing ? buildListingAvailability(listing, state.orders) : null),
    [listing, state.orders],
  );

  const isWaitlistMode =
    searchParams.get("mode") === "waitlist" ||
    listing?.status === LISTING_STATUS.RENTED.code ||
    availability?.rented;

  const waitlistQueue = useMemo(
    () => (listing ? getWaitlistForListing(state.rentWaitlists, listing.id) : []),
    [listing, state.rentWaitlists],
  );

  const myWaitlist = useMemo(() => {
    if (!user || !listing) return null;
    return (state.rentWaitlists ?? []).find(
      (w) =>
        w.listingId === listing.id &&
        w.renterId === user.id &&
        w.status === "waiting",
    );
  }, [user, listing, state.rentWaitlists]);

  const [deliveryMode, setDeliveryMode] = useState(DELIVERY_MODE.SHIPPER.code);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [careEnabled, setCareEnabled] = useState(true);
  const [carePlan, setCarePlan] = useState("basic");
  const [careDetailPlanId, setCareDetailPlanId] = useState(null);

  const pickupBase = useMemo(
    () => (listing ? buildListingPickupAddress(listing, owner) : null),
    [listing, owner],
  );

  const [pickupAddress, setPickupAddress] = useState(() => emptyGoshipAddress());
  const [pickupResolving, setPickupResolving] = useState(false);
  const [pickupResolveError, setPickupResolveError] = useState(null);

  const deliveryAddress = useMemo(() => {
    const saved = user?.goshipAddress;
    if (!saved?.city?.id) return null;
    return {
      name: saved.name ?? user?.name ?? "",
      phone: saved.phone ?? user?.phone ?? "",
      street: saved.street ?? "",
      city: saved.city,
      district: saved.district,
      ward: saved.ward,
    };
  }, [user]);

  const [formError, setFormError] = useState(null);

  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);

  const days =
    startDate && endDate
      ? Math.max(1, Math.round((endDate - startDate) / 86400000))
      : 0;

  const trustScore = user?.trustScore ?? 0;
  const isShipperDelivery = deliveryMode === DELIVERY_MODE.SHIPPER.code;
  const shippingFee = isShipperDelivery && selectedRate
    ? Number(selectedRate.total_fee ?? selectedRate.total_amount ?? 0)
    : 0;

  const transitDays =
    isShipperDelivery && selectedRate ? parseTransitDaysFromRate(selectedRate) : 0;

  const carePlans = useMemo(
    () => ["basic", "premium"].map((id) => getRelooCarePlanDetail(id, state.settings)),
    [state.settings],
  );

  const carePlanInfo = careEnabled ? getRelooCarePlanDetail(carePlan, state.settings) : null;
  const careDetailPlan = careDetailPlanId
    ? getRelooCarePlanDetail(careDetailPlanId, state.settings)
    : null;

  const orderPreview = useMemo(() => {
    if (!listing || !days) return null;
    return calcOrderTotal({
      dailyPrice: listing.dailyPrice,
      days,
      marketValue: listing.marketValue,
      trustScore,
      relooCarePlan: careEnabled ? carePlan : "none",
      shippingFee,
      includeDeposit: true,
      lenderUser: owner,
      renterUser: user,
    });
  }, [listing, days, trustScore, careEnabled, carePlan, shippingFee, owner, user]);

  useEffect(() => {
    if (!pickupBase) return;

    if (pickupBase.city?.id && pickupBase.district?.id && pickupBase.ward?.id) {
      setPickupAddress({
        name: pickupBase.name,
        phone: pickupBase.phone,
        street: pickupBase.street,
        city: pickupBase.city,
        district: pickupBase.district,
        ward: pickupBase.ward,
      });
      setPickupResolveError(null);
      return;
    }

    const ld = listing?.locationDetails;
    const provinceName = ld?.province?.name ?? listing?.location ?? "";
    const wardName = ld?.ward?.name ?? listing?.location ?? "";

    if (!provinceName) {
      setPickupResolveError("Chủ đồ chưa khai báo địa chỉ lấy hàng trên tin đăng.");
      return;
    }

    let alive = true;
    setPickupResolving(true);
    setPickupResolveError(null);

    resolveGoshipCodes({
      provinceName,
      wardName,
      street: pickupBase.street,
    })
      .then((resolved) => {
        if (!alive) return;
        setPickupAddress({
          name: pickupBase.name,
          phone: pickupBase.phone,
          street: resolved.street || pickupBase.street,
          city: resolved.city,
          district: resolved.district,
          ward: resolved.ward,
        });
      })
      .catch((err) => {
        if (alive) setPickupResolveError(err.message || "Không đồng bộ địa chỉ lấy hàng");
      })
      .finally(() => {
        if (alive) setPickupResolving(false);
      });

    return () => {
      alive = false;
    };
  }, [pickupBase, listing]);

  const fetchRates = useCallback(async () => {
    if (!isShipperDelivery) {
      setRates([]);
      setSelectedRate(null);
      setRatesError(null);
      setRatesLoading(false);
      return;
    }

    const pErr = validateGoshipAddress(pickupAddress, { requireContact: true });
    const dErr = deliveryAddress
      ? validateGoshipAddress(deliveryAddress, { requireContact: true })
      : { delivery: "Chưa có địa chỉ giao hàng" };

    if (Object.keys(pErr).length || Object.keys(dErr).length) {
      setRates([]);
      setSelectedRate(null);
      return;
    }

    setRatesLoading(true);
    setRatesError(null);

    try {
      const res = await fetch("/api/goship/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressFrom: {
            city: pickupAddress.city.id,
            district: pickupAddress.district.id,
            ward: pickupAddress.ward.id,
          },
          addressTo: {
            city: deliveryAddress.city.id,
            district: deliveryAddress.district.id,
            ward: deliveryAddress.ward.id,
          },
          parcel: {
            weight: listing?.specs?.weightGram ?? DEFAULT_PARCEL_WEIGHT,
            amount: listing?.marketValue ?? listing?.dailyPrice ?? 0,
            cod: 0,
          },
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Không tra được cước phí");
      }
      setRates(json.data ?? []);
      setSelectedRate((prev) => {
        if (prev && json.data?.some((r) => r.id === prev.id)) return prev;
        return json.data?.[0] ?? null;
      });
    } catch (err) {
      setRates([]);
      setSelectedRate(null);
      setRatesError(err.message || "Lỗi tra cước Goship");
    } finally {
      setRatesLoading(false);
    }
  }, [pickupAddress, deliveryAddress, listing, isShipperDelivery]);

  useEffect(() => {
    const timer = setTimeout(fetchRates, 400);
    return () => clearTimeout(timer);
  }, [fetchRates]);

  if (dbLoading && !listing) {
    return (
      <MarketplaceShell>
        <div className="container db-loading" style={{ padding: "96px 0" }}>
          <div className="dashboard-spinner" />
        </div>
      </MarketplaceShell>
    );
  }

  if (!listing) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="PackageX"
            title="Không tìm thấy sản phẩm"
            description="Tin cho thuê này không tồn tại."
            action={
              <Link href="/explore" className="btn btn-primary">
                Khám phá RELOO
              </Link>
            }
          />
        </div>
      </MarketplaceShell>
    );
  }

  function handleContinue() {
    setFormError(null);

    if (!user) {
      router.push(`/auth?next=/rent/${listing.id}`);
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Vui lòng chọn ngày nhận và ngày trả đồ.");
      return;
    }

    if (!deliveryAddress) {
      setFormError("Vui lòng khai báo địa chỉ giao hàng trong Hồ sơ cá nhân trước khi thuê.");
      return;
    }

    if (pickupResolveError) {
      setFormError(pickupResolveError);
      return;
    }

    const pErr = validateGoshipAddress(pickupAddress);
    const dErr = validateGoshipAddress(deliveryAddress);

    if (Object.keys(pErr).length || Object.keys(dErr).length) {
      setFormError("Đang đồng bộ địa chỉ vận chuyển. Vui lòng thử lại sau vài giây.");
      return;
    }

    if (isShipperDelivery && !selectedRate) {
      setFormError("Vui lòng chọn đơn vị vận chuyển (Goship).");
      return;
    }

    const startISO = startDate.toISOString().slice(0, 10);
    const endISO = endDate.toISOString().slice(0, 10);
    const careParam = careEnabled ? carePlan : "none";
    const fee = shippingFee;

    saveRentDraft(listing.id, {
      pickupAddress,
      deliveryAddress,
      selectedRate,
      shippingFee: fee,
      cccdHandoverRequired: true,
      deliveryMode,
      estimatedTransitDays: transitDays,
      rentalStartRule: getRentalStartRule(deliveryMode),
      estimatedShipByDate: startISO && transitDays
        ? estimateShipByDate(startDate, transitDays)?.toISOString().slice(0, 10)
        : null,
      estimatedRentalStartDate: startISO,
    });

    const qs = new URLSearchParams({
      start: startISO,
      end: endISO,
      care: careParam,
      shipping: String(fee),
      delivery: deliveryMode,
      ...(selectedRate?.id ? { rateId: selectedRate.id, carrier: selectedRate.carrier_name ?? "" } : {}),
    });

    router.push(`/checkout/${listing.id}?${qs.toString()}`);
  }

  function handleBackToProduct() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(`/product/${listing.id}`);
  }

  const deliveryDisplayLine = deliveryAddress
    ? formatGoshipAddress(deliveryAddress)
    : user?.address || "Chưa khai báo";

  if (isWaitlistMode && listing) {
    return (
      <MarketplaceShell>
        <div className="container rent-page">
          <button type="button" className="rent-page__back" onClick={handleBackToProduct}>
            <ArrowLeft size={14} /> Quay lại sản phẩm
          </button>

          <div className="rent-page__hero panel">
            <img src={listing.images?.[0]} alt={listing.title} className="rent-page__thumb" />
            <div>
              <h1>Đặt lệnh chờ thuê</h1>
              <p className="rent-page__listing-title">{listing.title}</p>
              <p className="rent-page__price text-muted text-sm">
                Sản phẩm đang được thuê — bạn có thể xếp hàng trước khi trống lịch.
              </p>
            </div>
          </div>

          <div className="rent-page__grid rent-page__grid--waitlist">
            <RentWaitlistForm
              listing={listing}
              availability={availability}
              user={user}
              existingWaitlist={myWaitlist}
              waitlistCount={waitlistQueue.length}
              onSubmit={(payload) => {
                if (!user) {
                  router.push(`/auth?next=/rent/${listing.id}?mode=waitlist`);
                  return;
                }
                actions.createRentWaitlist({
                  listingId: listing.id,
                  renterId: user.id,
                  ...payload,
                });
              }}
              onCancel={(waitlistId) => {
                if (user) actions.cancelRentWaitlist(waitlistId, user.id);
              }}
            />
          </div>
        </div>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell>
      <div className="container rent-page">
        <button type="button" className="rent-page__back" onClick={handleBackToProduct}>
          <ArrowLeft size={14} /> Quay lại sản phẩm
        </button>

        <div className="rent-page__hero panel">
          <img src={listing.images?.[0]} alt={listing.title} className="rent-page__thumb" />
          <div>
            <h1>Đặt thuê tài sản</h1>
            <p className="rent-page__listing-title">{listing.title}</p>
            <p className="rent-page__price">
              <Money amount={listing.dailyPrice} /> <span className="text-muted">/ ngày</span>
            </p>
          </div>
        </div>

        <RentalOperationSteps compact showGuideLink />

        <div className="rent-page__grid">
          <div className="rent-page__main">
            <section className="panel rent-section">
              <h2 className="rent-section__title">
                <CalendarDays size={18} /> Chọn thời gian thuê
              </h2>
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onSelect={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />

              <DeliveryModePicker value={deliveryMode} onChange={setDeliveryMode} />

              {startDate && (
                <RentalStartEstimate
                  deliveryMode={deliveryMode}
                  desiredStartDate={startDate}
                  transitDays={transitDays}
                />
              )}
            </section>

            <section className="panel rent-section care-section">
              <div className="care-section__title-row">
                <h2 className="rent-section__title care-section__title">
                  <ShieldCheck size={18} /> Gói An Tâm Reloo Care
                </h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={careEnabled}
                  aria-label="Bật Gói An Tâm Reloo Care"
                  className={`ios-switch ios-switch--sm ${careEnabled ? "is-on" : ""}`.trim()}
                  onClick={() => {
                    setCareEnabled((v) => {
                      if (!v) setCarePlan("basic");
                      return !v;
                    });
                  }}
                >
                  <span className="ios-switch__knob" />
                </button>
              </div>
              {careEnabled && (
                <div className="care-toggle">
                  {carePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`care-option ${carePlan === plan.id ? "care-option--active" : ""}`}
                    >
                      <button
                        type="button"
                        className="care-option__select"
                        onClick={() => setCarePlan(plan.id)}
                      >
                        <span className="care-option__name">{plan.name}</span>
                        <span className="care-option__desc">{plan.description}</span>
                      </button>
                      <button
                        type="button"
                        className="care-option__detail"
                        onClick={() => setCareDetailPlanId(plan.id)}
                      >
                        Chi tiết
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel rent-section">
              <h2 className="rent-section__title">
                <Package size={18} /> Địa chỉ lấy hàng
              </h2>
              <ReadonlyAddressCard
                title="Tại chỗ chủ đồ"
                subtitle="Địa chỉ đã khai báo trên tin cho thuê — shipper sẽ đến lấy tại đây"
                badge="Chủ đồ"
                name={pickupBase?.name}
                phone={pickupBase?.phone}
                addressLine={pickupBase?.displayLine}
              />
              {pickupResolving && (
                <p className="text-sm text-muted mt-2">Đang đồng bộ mã vận chuyển Goship…</p>
              )}
              {pickupResolveError && (
                <p className="rent-page__error mt-2" role="alert">
                  {pickupResolveError}
                </p>
              )}
            </section>

            <section className="panel rent-section">
              <h2 className="rent-section__title">
                <Truck size={18} /> Địa chỉ giao hàng
              </h2>
              <ReadonlyAddressCard
                title="Giao đến bạn"
                subtitle="Lấy từ hồ sơ cá nhân đã lưu"
                badge="Người thuê"
                name={deliveryAddress?.name ?? user?.name}
                phone={deliveryAddress?.phone ?? user?.phone}
                addressLine={deliveryDisplayLine}
                action={
                  !deliveryAddress ? (
                    <Link href="/dashboard/profile" className="btn btn-secondary btn-sm mt-3">
                      Cập nhật địa chỉ giao hàng
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/profile"
                      className="text-sm text-blue mt-2 inline-block"
                    >
                      Sửa trong Hồ sơ cá nhân
                    </Link>
                  )
                }
              />
            </section>

            <div className="panel rent-section rent-cccd-notice">
              <IdCard size={20} className="text-blue" />
              <div>
                <strong>Xác minh CCCD khi giao hàng</strong>
                <p>
                  Shipper / chủ đồ sẽ <strong>đối chiếu CCCD gốc trực tiếp</strong> với thông tin
                  tài khoản RELOO (eKYC) trước khi bàn giao tài sản. Không xuất trình giấy tờ hợp lệ
                  — không giao hàng (Rule R003 · Trust Platform).
                </p>
                <ul className="rent-handover-list text-sm">
                  {HANDOVER_IDENTITY_REQUIREMENTS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <ul className="rent-handover-list rent-handover-list--warn text-sm">
                  {HANDOVER_DELIVERY_RULES.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {isShipperDelivery && (
              <ShippingRatePicker
                rates={rates}
                selectedId={selectedRate?.id}
                onSelect={setSelectedRate}
                loading={ratesLoading}
                error={ratesError}
              />
            )}
          </div>

          <aside className="rent-page__aside">
            <div className="panel rent-summary-sticky">
              <h3 className="panel-title">Tóm tắt đơn thuê</h3>

              {pickupBase?.displayLine && (
                <div className="rent-summary-sticky__addr">
                  <span className="text-muted text-xs">Lấy hàng</span>
                  <p>{pickupBase.displayLine}</p>
                </div>
              )}
              {deliveryAddress && (
                <div className="rent-summary-sticky__addr">
                  <span className="text-muted text-xs">Giao hàng</span>
                  <p>{formatGoshipAddress(deliveryAddress)}</p>
                </div>
              )}

              {selectedRate && (
                <div className="rent-summary-sticky__carrier">
                  <Truck size={14} />
                  {selectedRate.carrier_name} · {selectedRate.service}
                </div>
              )}

              <RentalPaymentSummary
                compact
                days={days}
                dailyPrice={listing.dailyPrice}
                rentalTotal={orderPreview?.total ?? 0}
                rentalSubtotal={orderPreview?.subtotal ?? 0}
                rentalDiscount={orderPreview?.discount ?? 0}
                discountRate={orderPreview?.discountRate ?? 0}
                deposit={orderPreview?.deposit ?? 0}
                relooCareFee={orderPreview?.relooCareFee ?? 0}
                relooCareLabel={
                  carePlanInfo ? `Gói An Tâm · ${carePlanInfo.name}` : "Gói An Tâm Reloo Care"
                }
                shippingFee={shippingFee}
                grandTotal={orderPreview?.grandTotal ?? 0}
                showCare={careEnabled}
              />

              {formError && (
                <p className="rent-page__error" role="alert">
                  {formError}
                </p>
              )}

              <button type="button" className="btn btn-primary btn-lg w-full" onClick={handleContinue}>
                Tiếp tục thanh toán
              </button>
              {!user && (
                <p className="text-muted text-sm text-center">
                  Bạn cần <Link href={`/auth?next=/rent/${listing.id}`}>đăng nhập</Link> để thuê.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <RelooCarePlanDetailModal
        open={Boolean(careDetailPlanId)}
        onClose={() => setCareDetailPlanId(null)}
        plan={careDetailPlan}
      />
    </MarketplaceShell>
  );
}
