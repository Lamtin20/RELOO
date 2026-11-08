"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Check,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
import { Money } from "@/components/ui";
export function PricingEstimator({
  category = "may-anh",
  condition = "good",
  initialBrand = "",
  initialModel = "",
  onApply,
  headingLevel = 2,
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const [form, setForm] = useState({
    brand: initialBrand,
    model: initialModel,
    variant: "",
    category,
    condition,
    ageMonths: "0",
    purchasePrice: "",
    functional: true,
  });
  const [reply, setReply] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const signature = JSON.stringify(form),
    result = reply?.signature === signature ? reply.data : null;
  useEffect(() => {
    if (form.brand.trim().length < 1 || form.model.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/pricing/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: signature,
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(18000),
          ]),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setReply({ signature, data });
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause.name === "TimeoutError"
              ? "Tra cứu mất nhiều thời gian. Hãy thử lại."
              : cause.message,
          );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signature, retry, form.brand, form.model]);
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setBusy(false);
  }
  return (
    <section
      className="pricing-estimator"
      aria-labelledby="pricing-estimator-title"
    >
      <header>
        <div>
          <span>
            <Calculator size={16} />
            ĐỊNH GIÁ THAM KHẢO
          </span>
          <Heading id="pricing-estimator-title">
            Món đồ của bạn đáng giá bao nhiêu?
          </Heading>
          <p>
            Đối chiếu cùng model và cấu hình để đề xuất giá trị đồ, giá thuê mỗi
            ngày.
          </p>
        </div>
        <button
          type="button"
          title="Tra cứu lại"
          aria-label="Tra cứu lại giá"
          disabled={busy || !form.brand || form.model.length < 2}
          onClick={() => setRetry((value) => value + 1)}
        >
          <RefreshCw size={18} />
        </button>
      </header>
      <div className="pricing-inputs">
        <label>
          Thương hiệu
          <input
            value={form.brand}
            onChange={(event) => update("brand", event.target.value)}
            maxLength={60}
            placeholder="Apple, Sony, Naturehike…"
          />
        </label>
        <label>
          Model sản phẩm
          <input
            value={form.model}
            onChange={(event) => update("model", event.target.value)}
            maxLength={150}
            placeholder="iPhone 15 Pro, A7 IV…"
          />
        </label>
        <label>
          Phiên bản / cấu hình
          <input
            value={form.variant}
            onChange={(event) => update("variant", event.target.value)}
            maxLength={100}
            placeholder="128GB, 16GB 512GB, thân máy…"
          />
        </label>
        <label>
          Danh mục
          <select
            value={form.category}
            aria-label="Danh mục"
            disabled={Boolean(onApply)}
            onChange={(event) => update("category", event.target.value)}
          >
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tình trạng
          <select
            value={form.condition}
            aria-label="Tình trạng"
            disabled={Boolean(onApply)}
            onChange={(event) => update("condition", event.target.value)}
          >
            {Object.values(LISTING_CONDITIONS).map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Đã sử dụng (tháng)
          <input
            type="number"
            min={0}
            max={240}
            value={form.ageMonths}
            onChange={(event) => update("ageMonths", event.target.value)}
          />
        </label>
        <label className="pricing-inputs__wide">
          Giá mua hoặc giá bán mới bạn biết (không bắt buộc)
          <div className="pricing-money">
            <input
              type="number"
              min={0}
              max={1000000000}
              value={form.purchasePrice}
              onChange={(event) => update("purchasePrice", event.target.value)}
              placeholder="Nhập giá để ước tính khi chưa có dữ liệu thị trường"
            />
            <span>đ</span>
          </div>
        </label>
        <label className="pricing-functional">
          <input
            type="checkbox"
            checked={form.functional}
            onChange={(event) => update("functional", event.target.checked)}
          />
          Món đồ hoạt động bình thường, không có lỗi chức năng
        </label>
      </div>
      {busy && (
        <p className="pricing-status" role="status">
          <LoaderCircle className="spin" size={17} />
          Đang đối chiếu thông tin…
        </p>
      )}
      {error && (
        <p className="feature-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="pricing-result" aria-live="polite">
          <p className="pricing-result__basis">{result.message}</p>
          {result.asset && (
            <>
              <div className="pricing-offers">
                <div>
                  <span>Giá trị món đồ tham khảo</span>
                  <strong>
                    <Money amount={result.asset.suggested} />
                  </strong>
                  <small>
                    <Money amount={result.asset.low} /> –{" "}
                    <Money amount={result.asset.high} />
                  </small>
                </div>
                <div>
                  <span>Giá thuê đề xuất / ngày</span>
                  <strong>
                    <Money amount={result.rental.suggested} />
                  </strong>
                  <small>
                    <Money amount={result.rental.low} /> –{" "}
                    <Money amount={result.rental.high} />
                  </small>
                </div>
              </div>
              <p className="pricing-footnote">
                {result.rentalBasis === "CATEGORY_RULE"
                  ? "Giá thuê tính theo hệ số danh mục của RELOO; chưa phải giá thuê đã giao dịch."
                  : "Giá thuê đối chiếu từ các tin cùng cấu hình và tình trạng."}{" "}
                Chưa gồm tiền cọc và giao nhận. Mức chắc chắn:{" "}
                {result.confidence === "MEDIUM" ? "trung bình" : "thấp"}.
              </p>
              {onApply && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    onApply({
                      dailyPrice: result.rental.suggested,
                      marketValue: result.asset.suggested,
                    })
                  }
                >
                  <Check size={17} />
                  Dùng giá đề xuất
                </button>
              )}
            </>
          )}
          {result.evidence.length > 0 && (
            <details className="pricing-evidence">
              <summary>{result.evidence.length} mức giá đã đối chiếu</summary>
              {result.evidence.map((item, index) => (
                <a
                  key={`${item.url}-${index}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {
                        result.sources.find(
                          (source) => source.id === item.sourceId,
                        )?.name
                      }{" "}
                      · {new Date(item.observedAt).toLocaleDateString("vi-VN")}{" "}
                      ·{" "}
                      {item.kind === "new_retail"
                        ? "Giá bán mới"
                        : item.kind === "rental_daily"
                          ? "Giá thuê/ngày"
                          : "Giá rao bán"}
                    </span>
                  </div>
                  <Money amount={item.price} />
                  <ExternalLink size={14} />
                </a>
              ))}
            </details>
          )}
          <details className="pricing-source-status">
            <summary>Nguồn dữ liệu tham khảo</summary>
            {result.sources.map((source) => (
              <p key={source.id}>
                <span>{source.name}</span>
                <span>
                  {source.status === "SUCCESS"
                    ? "Đã ghi nhận giá"
                    : source.status === "BLOCKED_ROBOTS"
                      ? "URL không cho thu thập"
                      : "Chưa có kết nối khả dụng"}
                </span>
              </p>
            ))}
          </details>
        </div>
      )}
      {!result && !busy && !error && (
        <p className="pricing-footnote">
          Nhập thương hiệu và model để bắt đầu. Không dùng giá khác phiên bản
          làm cơ sở cho món đồ của bạn.
        </p>
      )}
      <Link href="/pricing/method" className="pricing-method-link">
        Cách RELOO đề xuất giá
        <ArrowRight size={14} />
      </Link>
    </section>
  );
}
