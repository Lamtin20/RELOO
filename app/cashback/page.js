"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  Gift,
  History,
  Link2,
  LoaderCircle,
  Music2,
  RefreshCw,
  Search,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { Money } from "@/components/ui";
import { ListingImage } from "@/components/listings/ListingImage";
import { useAuth } from "@/lib/store";

const STORES = [
  { id: "shopee", name: "Shopee", icon: ShoppingBag, tone: "orange" },
  { id: "tiktok", name: "TikTok Shop", icon: Music2, tone: "black" },
];
const STATUS_LABEL = {
  PENDING: "Chờ đối tác duyệt",
  APPROVED: "Đối tác đã duyệt",
  REJECTED: "Không đủ điều kiện",
};

export default function CashbackPage() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  if (!hydrated)
    return (
      <MarketplaceShell>
        <div className="container feature-empty" role="status">
          Đang tải chương trình hoàn tiền...
        </div>
      </MarketplaceShell>
    );
  return <CashbackExperience />;
}
function subscribeToHydration() {
  return () => {};
}
function CashbackExperience() {
  const { user } = useAuth();
  const [url, setUrl] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("product") || sessionStorage.getItem("reloo-cashback-link") || "";
    } catch {
      return "";
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState(null);
  const [status, setStatus] = useState(null);
  const [products, setProducts] = useState([]);
  const [feedError, setFeedError] = useState("");
  const [feedBusy, setFeedBusy] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [feedQuery, setFeedQuery] = useState("");
  const [merchant, setMerchant] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [nextCursor, setNextCursor] = useState(null);
  const [feedReason, setFeedReason] = useState("");
  const [feedEpoch, setFeedEpoch] = useState(0);
  const feedVersion = useRef(0);
  const [historyResult, setHistory] = useState(null);
  const history = user?.id === historyResult?.profileId ? historyResult : null;
  const [tab, setTab] = useState("shop");
  const requestVersion = useRef(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/affiliate/status")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(
      `/api/affiliate/products?${new URLSearchParams({ q: feedQuery, merchant, sort })}`,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products || []);
          setNextCursor(data.nextCursor || null);
          setFeedReason(data.reason || "");
          if (!data.ok) setFeedError(data.error);
        }
      })
      .catch(() => {
        if (!cancelled) setFeedError("Chưa tải được danh sách sản phẩm.");
      })
      .finally(() => {
        if (!cancelled) setFeedBusy(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [feedQuery, merchant, sort, feedEpoch]);
  useEffect(() => {
    const dates = products
      .map((item) => Date.parse(item.expiresAt))
      .filter(Number.isFinite);
    if (!dates.length) return;
    const timer = setTimeout(
      () => {
        setProducts((current) =>
          current.filter(
            (item) =>
              !item.expiresAt || Date.parse(item.expiresAt) > Date.now(),
          ),
        );
        setFeedReason(
          "Mức giá trong feed đã hết hiệu lực. Hãy tìm kiếm lại để xem thông tin mới.",
        );
      },
      Math.max(0, Math.min(2147483647, Math.min(...dates) - Date.now() + 1)),
    );
    return () => clearTimeout(timer);
  }, [products]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/affiliate/history")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) setHistory({ ...data, profileId: user.id });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);
  function updateUrl(value) {
    requestVersion.current++;
    setUrl(value);
    setLink(null);
    setError("");
    try {
      sessionStorage.setItem("reloo-cashback-link", value);
    } catch {
      /* Drafts do not affect attribution. */
    }
  }
  async function paste() {
    try {
      updateUrl(await navigator.clipboard.readText());
    } catch {
      setError(
        "Không đọc được clipboard. Bạn có thể dán trực tiếp vào ô liên kết.",
      );
    }
  }
  async function convert(event, value = url) {
    event?.preventDefault();
    const version = ++requestVersion.current;
    setBusy(true);
    setError("");
    setLink(null);
    try {
      const response = await fetch("/api/affiliate/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (version === requestVersion.current) setLink(data);
    } catch (cause) {
      if (version === requestVersion.current)
        setError(cause.message || "Chưa xử lý được liên kết.");
    } finally {
      setBusy(false);
    }
  }
  function search(event) {
    event.preventDefault();
    setFeedBusy(true);
    setFeedError("");
    feedVersion.current++;
    setProducts([]);
    setFeedQuery(keyword);
    setFeedEpoch((value) => value + 1);
  }
  function filterFeed(kind, value) {
    feedVersion.current++;
    setFeedBusy(true);
    setFeedError("");
    setProducts([]);
    setNextCursor(null);
    if (kind === "merchant") setMerchant(value);
    else setSort(value);
  }
  async function loadMore() {
    if (!nextCursor || feedBusy) return;
    const version = feedVersion.current;
    setFeedBusy(true);
    setFeedError("");
    try {
      const response = await fetch(
        `/api/affiliate/products?${new URLSearchParams({ q: feedQuery, merchant, sort, cursor: nextCursor })}`,
        { signal: AbortSignal.timeout(20000) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (version === feedVersion.current) {
        setProducts((current) => {
          const seen = new Set(
            current.map((item) => `${item.merchant}:${item.originalUrl}`),
          );
          const combined = [
            ...current,
            ...(data.products || []).filter(
              (item) => !seen.has(`${item.merchant}:${item.originalUrl}`),
            ),
          ];
          return sort === "price_asc"
            ? combined.sort((a, b) => a.price - b.price)
            : combined;
        });
        setNextCursor(data.nextCursor || null);
      }
    } catch (cause) {
      if (version === feedVersion.current) setFeedError(cause.message);
    } finally {
      if (version === feedVersion.current) setFeedBusy(false);
    }
  }
  return (
    <MarketplaceShell>
      <div className="cashback-page">
        <section className="cashback-intro">
          <div className="container">
            <div className="cashback-intro__heading">
              <div>
                <span className="r-eyebrow">
                  <Gift size={14} />
                  RELOO REWARDS
                </span>
                <h1>Mua sắm hoàn tiền</h1>
                <p>
                  Mua món đồ bạn thích. Theo dõi khoản hoàn của bạn trên RELOO.
                </p>
              </div>
              <img src="/mascot/reloop/approved-v2/master.webp" alt="RELOOP" />
            </div>
            <div
              className="cashback-modes"
              role="group"
              aria-label="Nội dung hoàn tiền"
            >
              <button
                type="button"
                aria-pressed={tab === "shop"}
                className={tab === "shop" ? "is-active" : ""}
                onClick={() => setTab("shop")}
              >
                <ShoppingBag size={16} />
                Mua sắm
              </button>
              <button
                type="button"
                aria-pressed={tab === "history"}
                className={tab === "history" ? "is-active" : ""}
                onClick={() => setTab("history")}
              >
                <History size={16} />
                Lịch sử hoàn tiền
              </button>
            </div>
          </div>
        </section>
        {tab === "shop" ? (
          <>
            <section
              className="container cashback-link-tool"
              aria-labelledby="paste-link-title"
            >
              <div className="cashback-link-tool__heading">
                <span className="feature-icon feature-icon--blue">
                  <Link2 size={23} />
                </span>
                <div>
                  <h2 id="paste-link-title">Dán link, kiểm tra hoàn tiền</h2>
                  <p>Liên kết sản phẩm Shopee hoặc TikTok Shop</p>
                </div>
              </div>
              <form onSubmit={convert} className="cashback-link-form">
                <Link2 size={19} />
                <input
                  type="url"
                  required
                  aria-label="Liên kết sản phẩm"
                  value={url}
                  onChange={(event) => updateUrl(event.target.value)}
                  placeholder="Dán liên kết sản phẩm bạn muốn mua..."
                  maxLength={2000}
                />
                <button
                  type="button"
                  className="cashback-paste"
                  title="Dán liên kết từ clipboard"
                  aria-label="Dán liên kết"
                  onClick={paste}
                >
                  <ClipboardPaste size={19} />
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                >
                  {busy ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <ArrowRight size={17} />
                  )}
                  <span>{busy ? "Đang kiểm tra..." : "Kiểm tra link"}</span>
                </button>
              </form>
              {error && (
                <div className="cashback-feedback" role="alert">
                  <p>{error}</p>
                  {!user && (
                    <Link href="/auth?next=%2Fcashback">
                      Đăng nhập RELOO <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              )}
              {link && (
                <div className="cashback-link-result" role="status">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>
                      {link.product?.title ||
                        `Liên kết ${link.merchant === "shopee" ? "Shopee" : "TikTok Shop"} đã sẵn sàng`}
                    </strong>
                    <p>
                      Liên kết đã gắn với tài khoản của bạn. Khoản hoàn chỉ được
                      xác nhận khi đối tác ghi nhận và duyệt đơn hợp lệ.
                    </p>
                  </div>
                  <a
                    href={link.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="btn btn-primary"
                  >
                    Đến cửa hàng <ExternalLink size={16} />
                  </a>
                </div>
              )}
              <p className="feature-footnote">
                Chỉ đơn mua qua liên kết được RELOO tạo mới có thể được đối tác
                ghi nhận. Điều kiện hoàn tiền tùy chiến dịch và từng sản phẩm.
              </p>
            </section>
            <section className="container cashback-stores">
              <div className="r-section-heading">
                <div>
                  <span className="r-eyebrow">CỬA HÀNG ĐỐI TÁC</span>
                  <h2>Mua ở nơi bạn quen</h2>
                </div>
                <span
                  className={`partner-status ${status?.connected && status?.cashbackApproved ? "partner-status--ready" : ""}`}
                >
                  {status?.connected && status?.cashbackApproved
                    ? "Đã cấu hình đối tác"
                    : "Đang chờ kết nối đối tác"}
                </span>
              </div>
              <div className="cashback-stores__grid">
                {STORES.map((store) => (
                  <article
                    key={store.id}
                    className={`cashback-store cashback-store--${store.tone}`}
                  >
                    <span className="cashback-store__logo">
                      <store.icon size={29} />
                    </span>
                    <div>
                      <h3>{store.name}</h3>
                      <p>
                        {status?.merchants?.[store.id]
                          ? "Hoàn theo từng sản phẩm"
                          : "Chương trình chưa mở"}
                      </p>
                    </div>
                    <span className="cashback-store__state">
                      {status?.merchants?.[store.id] ? (
                        <CheckCircle2 size={19} />
                      ) : (
                        "Sắp mở"
                      )}
                    </span>
                  </article>
                ))}
              </div>
            </section>
            <section className="cashback-how">
              <div className="container">
                <span className="r-eyebrow">
                  MỖI ĐƠN HỢP LỆ, THÊM MỘT KHOẢN HOÀN
                </span>
                <h2>Mua sắm và theo dõi thật rõ ràng</h2>
                <div className="cashback-how__grid">
                  {[
                    {
                      number: "01",
                      title: "Tạo liên kết trên RELOO",
                      text: "Dán link và dùng liên kết được tạo cho tài khoản của bạn.",
                    },
                    {
                      number: "02",
                      title: "Mua hàng tại cửa hàng",
                      text: "Hoàn tất đơn hàng theo điều kiện của chiến dịch đối tác.",
                    },
                    {
                      number: "03",
                      title: "Chờ đối tác xác nhận",
                      text: "Theo dõi chờ duyệt, đã duyệt hoặc không đủ điều kiện trong lịch sử.",
                    },
                  ].map((step) => (
                    <div key={step.number}>
                      <span>{step.number}</span>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  ))}
                </div>
                <Link href="/cashback/terms" className="r-text-link">
                  Điều kiện hoàn tiền <ArrowRight size={16} />
                </Link>
              </div>
            </section>
            <section className="container cashback-products">
              <div className="r-section-heading">
                <div>
                  <span className="r-eyebrow">SHOPEE & TIKTOK SHOP</span>
                  <h2>Sản phẩm từ đối tác</h2>
                </div>
              </div>
              <div className="cashback-feed-filters">
                <div role="group" aria-label="Lọc cửa hàng">
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "shopee", label: "Shopee" },
                    { id: "tiktok", label: "TikTok Shop" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={merchant === item.id}
                      onClick={() => {
                        if (merchant !== item.id)
                          filterFeed("merchant", item.id);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Sắp xếp sản phẩm hoàn tiền"
                  value={sort}
                  onChange={(event) => filterFeed("sort", event.target.value)}
                >
                  <option value="recommended">Đề xuất</option>
                  <option value="price_asc">Giá tăng dần</option>
                </select>
              </div>
              <form onSubmit={search} className="cashback-product-search">
                <Search size={17} />
                <input
                  aria-label="Tìm sản phẩm hoàn tiền"
                  placeholder="Tìm món đồ bạn thích"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  maxLength={80}
                />
                <button
                  type="submit"
                  title="Tìm sản phẩm"
                  aria-label="Tìm sản phẩm"
                  disabled={feedBusy}
                >
                  <ArrowRight size={18} />
                </button>
              </form>
              {feedError && products.length > 0 && (
                <p className="feature-error" role="alert">
                  {feedError}
                </p>
              )}
              {feedBusy && !products.length ? (
                <div className="feature-empty" role="status">
                  <LoaderCircle size={25} className="spin" />
                  Đang tải sản phẩm từ đối tác...
                </div>
              ) : products.length ? (
                <div className="cashback-product-grid">
                  {products.map((product) => (
                    <article className="cashback-product" key={product.id}>
                      <ListingImage
                        images={[product.image]}
                        alt={product.title}
                      />
                      <div>
                        <span className="cashback-product__merchant">
                          {product.merchant === "shopee"
                            ? "Shopee"
                            : "TikTok Shop"}
                        </span>
                        <h3>{product.title}</h3>
                        {product.price != null && (
                          <Money amount={product.price} />
                        )}
                        <p>
                          {product.cashbackPercent != null
                            ? `Hoàn dự kiến ${product.cashbackPercent}%`
                            : "Khoản hoàn theo điều kiện sản phẩm"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            updateUrl(product.originalUrl);
                            convert(null, product.originalUrl);
                            document
                              .getElementById("paste-link-title")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                          }}
                          className="r-text-link"
                          disabled={
                            busy || !status?.merchants?.[product.merchant]
                          }
                        >
                          {status?.merchants?.[product.merchant]
                            ? "Tạo link mua"
                            : "Chưa mở hoàn tiền"}{" "}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="feature-empty">
                  <ShoppingBag size={31} />
                  <h3>
                    {feedError
                      ? "Chưa tải được sản phẩm"
                      : "Sản phẩm sẽ xuất hiện khi đối tác được kết nối"}
                  </h3>
                  <p>
                    {feedError ||
                      feedReason ||
                      "Chưa có danh sách sản phẩm và mức hoàn tiền được xác nhận từ đối tác."}
                  </p>
                </div>
              )}
              {nextCursor && products.length > 0 && (
                <div className="cashback-feed-more">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={feedBusy}
                    onClick={loadMore}
                  >
                    {feedBusy ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <RefreshCw size={17} />
                    )}
                    Xem thêm sản phẩm
                  </button>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="container cashback-history">
            <div className="cashback-balance">
              <Wallet size={25} />
              <div>
                <span>Khoản hoàn được đối tác duyệt</span>
                <strong>
                  {history ? (
                    <Money amount={history.approvedBalance} />
                  ) : (
                    "Chưa có dữ liệu"
                  )}
                </strong>
              </div>
            </div>
            {!user ? (
              <div className="feature-empty">
                <History size={30} />
                <h2>Lịch sử hoàn tiền của bạn</h2>
                <Link className="btn btn-primary" href="/auth?next=%2Fcashback">
                  Đăng nhập để xem lịch sử
                </Link>
              </div>
            ) : !history ? (
              <p className="feature-footnote">
                Chưa lấy được lịch sử. Vui lòng thử lại sau.
              </p>
            ) : !history.conversions?.length ? (
              <div className="feature-empty">
                <ShoppingBag size={30} />
                <h3>Chưa có đơn được đối tác ghi nhận</h3>
                <p>
                  Liên kết tạo mới không đồng nghĩa với đơn hàng đã hoàn tất.
                </p>
              </div>
            ) : (
              <div className="cashback-order-list">
                {history.conversions.map((item) => (
                  <div key={item.id}>
                    <div>
                      <strong>
                        {item.merchant.includes("shopee")
                          ? "Shopee"
                          : "TikTok Shop"}
                      </strong>
                      <span
                        className={`cashback-order-status cashback-order-status--${item.status.toLowerCase()}`}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <Money amount={item.reward} />
                  </div>
                ))}
              </div>
            )}
            <p className="feature-footnote">
              Số tiền đã duyệt chưa đồng nghĩa với khoản đã chi trả. Đơn hủy
              hoặc bị đối tác từ chối được điều chỉnh trong đối soát.
            </p>
          </section>
        )}
      </div>
    </MarketplaceShell>
  );
}
