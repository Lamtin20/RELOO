"use client";
import { useAuth } from "@/lib/store";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { Money } from "@/components/ui";
export function CustomerOffers({ context = null, onSelect = null }) {
  const { user } = useAuth();
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const a = new AbortController();
    fetch(
      context
        ? "/api/promotions/recommendations?" + context
        : "/api/promotions/available",
      { signal: a.signal },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        return d;
      })
      .then((d) => {
        if (!a.signal.aborted) {
          setData({ context, userId: user?.id, offers: d.offers });
          setError("");
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => a.abort();
  }, [context, user?.id]);
  const offers =
    data?.context === context && (!context || data.userId === user?.id)
      ? data.offers
      : null;
  return (
    <section className="customer-offers">
      <header>
        <MorphIcon icon={Gift} size={22} />
        <h2>{context ? "Ưu đãi phù hợp với đơn" : "Ưu đãi dành cho bạn"}</h2>
      </header>
      {error ? (
        <p role="status">{error}</p>
      ) : !offers ? (
        <p role="status">Đang kiểm tra ưu đãi…</p>
      ) : !offers.length ? (
        <p>
          {context
            ? "Chưa có ưu đãi đủ điều kiện cho đơn này."
            : "Các chương trình mới sẽ hiển thị tại đây khi được công bố."}
        </p>
      ) : (
        <div className="customer-offer-list">
          {offers.map((o) => {
            const campaign = o.promotion_campaigns;
            return (
              <article key={o.couponId || o.id}>
                <div>
                  <span className="offer-code">{o.code}</span>
                  <h3>{o.programName || campaign.name}</h3>
                  <p>
                    {context ? (
                      <>
                        Giảm dự kiến <Money amount={o.discount} />
                      </>
                    ) : o.discount_type === "PERCENT" ? (
                      <>Giảm {Number(o.value) / 100}% theo điều kiện</>
                    ) : (
                      <>
                        Giảm <Money amount={o.value} /> theo điều kiện
                      </>
                    )}
                  </p>
                  {!context && (
                    <small>
                      Đơn tối thiểu <Money amount={o.minimum_amount} />
                      {o.first_order_only ? " · Đơn đầu tiên" : ""}
                    </small>
                  )}
                </div>
                <details>
                  <summary>Điều kiện áp dụng</summary>
                  <p>{o.terms || campaign.terms}</p>
                </details>
                {onSelect && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onSelect(o)}
                  >
                    Chọn ưu đãi
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
      {context && (
        <small>
          Hệ thống sẽ kiểm tra lại điều kiện, lượt dùng và ngân sách khi áp
          dụng. Đề xuất chưa giữ chỗ hoặc thay đổi giá đơn.
        </small>
      )}
      {!context && <Link href="/explore">Khám phá sản phẩm</Link>}
    </section>
  );
}
