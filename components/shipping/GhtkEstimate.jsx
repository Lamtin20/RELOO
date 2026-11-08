"use client";

import { useRef, useState } from "react";
import { Truck, Calculator, LoaderCircle, MapPin } from "lucide-react";
import { Money } from "@/components/ui";
import { AddressFields } from "@/components/location/AddressFields";

export function GhtkEstimate({
  listing,
  onQuote,
  agreementId,
  pickupAddress,
  deliveryAddress,
}) {
  const initial = pickupAddress || listing?.locationDetails || {};
  const target = deliveryAddress || {};
  const [addresses, setAddresses] = useState({ pick_: initial, "": target });
  const [form, setForm] = useState({
    pick_province: initial.province?.name || "",
    pick_ward: initial.ward?.name || "",
    pick_address: [initial.house, initial.street].filter(Boolean).join(" "),
    province: target.province?.name || "",
    ward: target.ward?.name || "",
    address: [target.house, target.street].filter(Boolean).join(" "),
    weight: "1000",
    value: String(listing?.marketValue || 0),
    transport: "road",
  });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  function update(field, value) {
    sequence.current += 1;
    setForm((current) => ({ ...current, [field]: value }));
    setQuote(null);
    setError("");
    onQuote?.(null);
  }
  async function estimate(event) {
    event.preventDefault();
    const version = ++sequence.current;
    setBusy(true);
    setError("");
    setQuote(null);
    onQuote?.(null);
    try {
      const response = await fetch("/api/ghtk/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agreementId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(data.error || "Chưa lấy được cước giao hàng.");
      if (version === sequence.current) {
        setQuote(data.quote);
        onQuote?.(data.quote);
      }
    } catch (cause) {
      if (version === sequence.current) setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="shipping-estimate"
      aria-labelledby="shipping-estimate-title"
    >
      <div className="feature-heading">
        <span className="feature-icon feature-icon--green">
          <Truck size={22} />
        </span>
        <div>
          <h2 id="shipping-estimate-title">Tạm tính phí giao hàng</h2>
          <p>Giao Hàng Tiết Kiệm · Báo giá theo địa chỉ và khối lượng</p>
        </div>
      </div>
      <form onSubmit={estimate}>
        <div className="shipping-addresses">
          {[
            { prefix: "pick_", title: "Lấy đồ tại" },
            { prefix: "", title: "Giao đồ đến" },
          ].map(({ prefix, title }) => (
            <fieldset key={title}>
              <legend>
                <MapPin size={15} />
                {title}
              </legend>
              <AddressFields
                value={addresses[prefix]}
                label=""
                onChange={(value) => {
                  setAddresses({ ...addresses, [prefix]: value });
                  sequence.current++;
                  setForm((current) => ({
                    ...current,
                    [prefix + "province"]: value.province?.name || "",
                    [prefix + "ward"]: value.ward?.name || "",
                    [prefix + "address"]: [value.house, value.street]
                      .filter(Boolean)
                      .join(" "),
                  }));
                  setQuote(null);
                  onQuote?.(null);
                }}
              />
            </fieldset>
          ))}
        </div>
        <div className="shipping-parcel">
          <label>
            Khối lượng (gram)
            <input
              type="number"
              min={1}
              max={30000}
              required
              value={form.weight}
              onChange={(event) => update("weight", event.target.value)}
            />
          </label>
          <label>
            Giá trị khai báo (đ)
            <input
              type="number"
              min={0}
              max={100000000}
              value={form.value}
              onChange={(event) => update("value", event.target.value)}
            />
          </label>
          <label>
            Vận chuyển
            <select
              value={form.transport}
              onChange={(event) => update("transport", event.target.value)}
            >
              <option value="road">Đường bộ</option>
              <option value="fly">Đường bay</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Calculator size={16} />
          )}
          {busy ? "Đang tra cước..." : "Tính cước GHTK"}
        </button>
      </form>
      {error && (
        <p className="feature-error" role="alert">
          {error}
        </p>
      )}
      {quote && (
        <div className="shipping-result" role="status">
          <div>
            <span>Cước vận chuyển (đã gồm phụ phí)</span>
            <Money amount={quote.shipping} />
          </div>
          <div>
            <span>Phí khai giá</span>
            <Money amount={quote.insurance} />
          </div>
          {quote.extras.map((extra, index) => (
            <div key={index} className="shipping-result__included">
              <span>{extra.title} · đã gồm trong cước</span>
              <Money amount={extra.amount} />
            </div>
          ))}
          <div className="shipping-result__total">
            <strong>Tạm tính một chiều</strong>
            <Money amount={quote.total} />
          </div>
          {!quote.delivery && (
            <p className="feature-error">
              GHTK chưa xác nhận hỗ trợ giao tại địa chỉ này.
            </p>
          )}
        </div>
      )}
      <p className="feature-footnote">
        Chỉ là báo giá tham khảo, chưa tạo vận đơn. Phí thực tế phụ thuộc đóng
        gói và khối lượng được GHTK xác nhận; phí trả đồ tính riêng.
      </p>
    </section>
  );
}
