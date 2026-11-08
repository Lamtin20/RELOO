"use client";
import { useEffect, useState } from "react";
import { QrCode, ShieldCheck, LoaderCircle } from "lucide-react";
import { formatMoney } from "@/lib/finance/wallet-display";
import { GhtkEstimate } from "@/components/shipping/GhtkEstimate";
import {CustomerOffers} from '@/components/promotions/CustomerOffers';
export function RentalPayment({ agreement, payer }) {
  const [data, setData] = useState(null),
    [code, setCode] = useState(""),
    [quote, setQuote] = useState(null),
    [qr, setQr] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const a = new AbortController();
    const load = () =>
      fetch("/api/rental/payments?agreement=" + agreement.id, {
        signal: a.signal,
      })
        .then(async (r) => {
          const d = await r.json();
          if (r.ok) setData(d);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => {
      a.abort();
      clearInterval(t);
    };
  }, [agreement.id]);
  if (!data?.enabled && !data?.payments?.length && !data?.shipping) return null;
  const paid = data.payments.find((p) => ["PAID", "FREE"].includes(p.status)),
    locked = data.payments[0];
  const price = locked || quote;
  return (
    <section className="rental-payment">
      {(data.enabled || data.payments.length > 0) && (
        <>
          <h3>
            <QrCode size={19} />
            Thanh toán tiền thuê
          </h3>
          {payer&&!locked&&['ACCEPTED','ACTIVE'].includes(agreement.status)&&<CustomerOffers context={'agreement='+encodeURIComponent(agreement.id)} onSelect={offer=>{setCode(offer.code);setQuote(offer);setError('');}}/>}
          {price && (
            <div className="promo-order-price">
              <div>
                <span>Giá thuê đã thỏa thuận</span>
                <strong>{formatMoney(price.grossAmount || price.gross)}</strong>
              </div>
              <div>
                <span>Coupon {(locked?.promotion || quote)?.code}</span>
                <strong>
                  −{formatMoney(price.discountAmount || price.discount || "0")}
                </strong>
              </div>
              <div>
                <span>Người thuê thanh toán</span>
                <strong>{formatMoney(price.amount || price.net)}</strong>
              </div>
              <div>
                <span>Chủ đồ nhận</span>
                <strong>{formatMoney(price.ownerAmount)}</strong>
              </div>
              {(locked?.promotion || quote) && (
                <small>
                  {(locked?.promotion || quote)?.funder === "RELOO"
                    ? "RELOO tài trợ phần giảm bằng ngân sách đã đối soát."
                    : "Phần giảm theo chương trình chủ đồ đã đồng ý tham gia."}
                </small>
              )}
            </div>
          )}
          {paid ? (
            <p className="cashflow-success">
              <ShieldCheck size={18} />
              {paid.status === "FREE"
                ? "Miễn phí theo chương trình · không cần chuyển khoản"
                : "Đã đối soát " + formatMoney(paid.amount)}
            </p>
          ) : (
            <>
              {payer && !locked && (
                <form
                  className="promo-code-entry"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    try {
                      const r = await fetch("/api/promotions/quote", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            agreementId: agreement.id,
                            code,
                          }),
                        }),
                        d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      setQuote(d.quote);
                    } catch (e) {
                      setError(e.message);
                      setQuote(null);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Mã coupon
                    <input
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setQuote(null);
                      }}
                      placeholder="Nhập mã ưu đãi"
                      maxLength={40}
                    />
                  </label>
                  <button
                    className="btn btn-secondary"
                    disabled={busy || !code.trim()}
                  >
                    Áp dụng mã
                  </button>
                  {quote && (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
                        setCode("");
                        setQuote(null);
                      }}
                    >
                      Bỏ mã trước khi chốt giá
                    </button>
                  )}
                </form>
              )}
              <p>
                QR dùng VA riêng của người thuê. Tiền chỉ được ghi nhận sau khi
                đối soát ngân hàng.
              </p>
              {payer && ["ACCEPTED", "ACTIVE"].includes(agreement.status) && (
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const r = await fetch("/api/rental/payments", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            agreementId: agreement.id,
                            couponCode: locked?.promotion?.code || code,
                          }),
                        }),
                        d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      setQr(d);
                      const fresh = await fetch(
                        "/api/rental/payments?agreement=" + agreement.id,
                      ).then((r) => r.json());
                      if (fresh.ok) setData(fresh);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <QrCode size={18} />
                  )}
                  {quote?.net === "0"
                    ? "Xác nhận đơn miễn phí"
                    : "Hiển thị QR thanh toán"}
                </button>
              )}
              {error && (
                <p role="alert" className="ops-error">
                  {error}
                </p>
              )}
              {qr?.qr && (
                <div className="rental-qr">
                  <img src={qr.qr} alt="QR thanh toán vào tài khoản ảo riêng" />
                  <div>
                    <strong>{formatMoney(qr.payment.amount)}</strong>
                    <p>
                      {qr.bank} · {qr.account}
                    </p>
                    <code>{qr.payment.reference}</code>
                    <p>
                      Giữ nguyên nội dung chuyển tiền. Trạng thái tự cập nhật
                      khi ngân hàng xác nhận.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      {data.shipping && (
        <GhtkEstimate
          agreementId={agreement.id}
          pickupAddress={data.shipping.pickup}
          deliveryAddress={data.shipping.delivery}
        />
      )}
    </section>
  );
}
