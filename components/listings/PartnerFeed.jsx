"use client";
import {useEffect,useState} from 'react';import Link from 'next/link';import {RefreshCw,Store,ArrowUpRight,Link2} from 'lucide';import {MorphIcon} from '@/components/ui/MorphIcon';import {ListingGrid} from './ListingGrid';import {ListingImage} from './ListingImage';import {Money} from '@/components/ui';
export function PartnerFeed({ channel, address }) {
  const [snapshot, setSnapshot] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      channel === "BRAND" ? "/api/local-brands" : "/api/affiliate/products",
      { signal: controller.signal },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.ok===false || !Array.isArray(d[channel==='BRAND'?'brands':'products'])) throw Error(d.error || "Chưa tải được sản phẩm.");
        return d;
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSnapshot({ channel, data });
          setError("");
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [channel, retry]);
  const data = snapshot?.channel === channel ? snapshot.data : null;
  return (
    <div className="market-partners">
      {error ? (
        <div className="market-empty" role="alert">
          <p>{error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setError("");
              setRetry((r) => r + 1);
            }}
          >
            <MorphIcon icon={RefreshCw} size={17} /> Thử lại
          </button>
        </div>
      ) : !data ? (
        <div className="market-loading" role="status">
          Đang tải sản phẩm…
        </div>
      ) : channel === "BRAND" ? (
        data.brands.length ? (
          data.brands.map((brand) => (
            <section key={brand.id} className="market-brand">
              <header>
                {brand.image ? (
                  <img src={brand.image} alt="" width="52" height="52" />
                ) : (
                  <span>
                    <MorphIcon icon={Store} size={26} />
                  </span>
                )}
                <div>
                  <h3>{brand.name}</h3>
                  <p>{brand.description}</p>
                </div>
                <Link
                  href={"/user/" + encodeURIComponent(brand.ownerId)}
                  aria-label={"Xem shop " + brand.name}
                >
                  <MorphIcon icon={ArrowUpRight} size={22} />
                </Link>
              </header>
              <ListingGrid
                listings={brand.products}
                priceMode="SALE"
                viewerAddress={address}
                emptyTitle="Shop đang chuẩn bị sản phẩm"
              />
            </section>
          ))
        ) : (
          <div className="market-empty">
            <MorphIcon icon={Store} size={36} />
            <h3>Hẹn bạn ở Local Brand</h3>
            <p>
              Các thương hiệu được RELOO kết nối sẽ xuất hiện tại đây khi có hồ
              sơ được công bố.
            </p>
            <Link href="/help">Liên hệ hợp tác</Link>
          </div>
        )
      ) : (
        <>
          <p className="market-disclosure">
            <MorphIcon icon={Link2} size={16} /> Sản phẩm liên kết · Bạn mua và
            thanh toán tại đối tác. Hoàn tiền tùy điều kiện từng chương trình.
          </p>
          {data.products.length ? (
            <div className="market-affiliate-grid">
              {data.products.slice(0, 12).map((p) => (
                <Link
                  key={p.merchant + ":" + p.id}
                  href={
                    "/cashback?product=" + encodeURIComponent(p.originalUrl)
                  }
                  className="market-affiliate-card"
                >
                  <ListingImage
                    images={p.image ? [p.image] : []}
                    alt={p.title}
                    className="market-affiliate-card__image"
                  />
                  <span className="market-label market-label--affiliate">
                    {p.merchant === "shopee" ? "Shopee" : "TikTok Shop"} · Liên
                    kết
                  </span>
                  <h3>{p.title}</h3>
                  <Money amount={p.price} />
                  {p.cashbackPercent > 0 && (
                    <small>Hoàn đến {p.cashbackPercent}% theo điều kiện</small>
                  )}
                  <span className="market-affiliate-card__cta">
                    Xem ưu đãi <MorphIcon icon={ArrowUpRight} size={16} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="market-empty">
              <h3>Chưa có ưu đãi đang mở</h3>
              <p>
                {data.reason ||
                  "Ưu đãi sẽ hiển thị khi đối tác cung cấp sản phẩm."}
              </p>
              <Link href="/cashback">Kiểm tra liên kết của bạn</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
