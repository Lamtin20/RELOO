"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Info,
  MapPin,
  Package,
  Search,
  Share2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { ListingCard } from "@/components/listings/ListingCard";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { useSavedOwners } from "@/lib/hooks/useSavedOwners";
import { formatMemberDuration } from "@/lib/utils";

function searchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export default function UserWallPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { state, hydrated: ready } = useReloo();
  const { allListings } = useListings();
  const { savedIds, toggleSaved } = useSavedOwners();
  const [tab, setTab] = useState("available");
  const [query, setQuery] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [copyUrl, setCopyUrl] = useState("");
  const owner = state.users.find((person) => person.id === id);
  const listings = useMemo(
    () =>
      allListings.filter(
        (listing) =>
          listing.ownerId === id &&
          ["available", "rented"].includes(listing.status),
      ),
    [allListings, id],
  );
  const available = listings.filter(
    (listing) => listing.status === "available",
  );
  const rented = listings.filter((listing) => listing.status === "rented");
  const displayed = (tab === "available" ? available : rented).filter(
    (listing) =>
      searchText(`${listing.title} ${listing.location}`).includes(
        searchText(query),
      ),
  );
  const rated = listings.filter(
    (listing) =>
      listing.reviewCount > 0 &&
      Number.isFinite(listing.rating) &&
      listing.rating > 0 &&
      listing.rating <= 5,
  );
  const totalReviews = rated.reduce(
    (total, listing) => total + listing.reviewCount,
    0,
  );
  const rating = totalReviews
    ? rated.reduce(
        (total, listing) => total + listing.rating * listing.reviewCount,
        0,
      ) / totalReviews
    : null;
  const saved = savedIds.includes(id);
  async function share() {
    const url = `${window.location.origin}/user/${encodeURIComponent(id)}`;
    setShareMessage("");
    setCopyUrl("");
    try {
      if (navigator.share)
        await navigator.share({ title: `${owner.name} · RELOO`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Đã sao chép liên kết hồ sơ.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setCopyUrl(url);
        setShareMessage("Bạn có thể chọn và sao chép liên kết bên dưới.");
      }
    }
  }
  if (!owner)
    return (
      <MarketplaceShell hideHeader={false}>
        <div className="container public-owner__empty">
          <Package size={36} />
          <h1>Chưa tìm thấy hồ sơ này</h1>
          <p>Hồ sơ có thể đã được ẩn hoặc chưa tải được.</p>
          <Link href="/explore" className="btn btn-primary">
            Khám phá đồ thuê <ArrowRight size={17} />
          </Link>
        </div>
      </MarketplaceShell>
    );
  const location = owner.address || listings[0]?.location;
  const joined = owner.joinedAt && Number.isFinite(Date.parse(owner.joinedAt));
  return (
    <MarketplaceShell hideHeader={false}>
      <div
        className="container public-owner"
        data-ready={ready}
        aria-busy={!ready}
      >
        <nav className="public-owner__breadcrumb" aria-label="Hồ sơ chủ đồ">
          <Link href="/explore">
            <ArrowLeft size={18} /> Khám phá đồ thuê
          </Link>
          <span>Hồ sơ chủ đồ</span>
        </nav>
        <div className="public-owner__layout">
          <aside
            className="public-owner__identity"
            aria-label="Thông tin chủ đồ"
          >
            {!state.dbSynced && id.startsWith("user_") && (
              <span className="public-owner__demo">
                <Info size={13} />
                Hồ sơ minh họa
              </span>
            )}
            <div className="public-owner__person">
              <img
                src={owner.avatar || "/brand/reloo-logo.png"}
                alt={`Ảnh đại diện ${owner.name}`}
                className="public-owner__avatar"
                onError={(event) => {
                  if (
                    !event.currentTarget.src.endsWith("/brand/reloo-logo.png")
                  )
                    event.currentTarget.src = "/brand/reloo-logo.png";
                }}
              />
              <div>
                <h1>{owner.name}</h1>
                <span>Thành viên cộng đồng RELOO</span>
              </div>
            </div>
            <ul className="public-owner__facts">
              {location && (
                <li>
                  <MapPin size={16} />
                  <span>{location}</span>
                </li>
              )}
              {joined && (
                <li>
                  <Clock size={16} />
                  <span>Tham gia {formatMemberDuration(owner.joinedAt)}</span>
                </li>
              )}
              <li>
                <Package size={16} />
                <span>
                  <strong>{available.length}</strong> món đồ có thể thuê ·{" "}
                  <strong>{rented.length}</strong> đang được thuê
                </span>
              </li>
            </ul>
            {owner.bio && (
              <div className="public-owner__bio">
                <h2>Giới thiệu của chủ đồ</h2>
                <p>{owner.bio}</p>
              </div>
            )}
            <div className="public-owner__actions">
              <button type="button" onClick={share} disabled={!ready}>
                <Share2 size={16} />
                Chia sẻ
              </button>
              {user?.id === id ? (
                <Link href="/dashboard/profile">Sửa hồ sơ</Link>
              ) : (
                <button
                  type="button"
                  aria-pressed={saved}
                  disabled={!ready}
                  title="Lưu chủ đồ trên thiết bị này"
                  onClick={() => {
                    if (!toggleSaved(id))
                      setShareMessage("Chưa lưu được trên thiết bị này.");
                  }}
                >
                  {saved ? <Check size={16} /> : <Bookmark size={16} />}
                  {saved ? "Đã lưu" : "Lưu chủ đồ"}
                </button>
              )}
            </div>
            {shareMessage && (
              <p className="public-owner__share-feedback" role="status">
                {shareMessage}
              </p>
            )}
            {copyUrl && (
              <input
                className="public-owner__share-url"
                readOnly
                value={copyUrl}
                aria-label="Liên kết hồ sơ để sao chép"
                onFocus={(event) => event.target.select()}
              />
            )}
            <Link className="public-owner__safety" href="/safety">
              <span>
                <ShieldCheck size={17} />
                Thuê đồ có thông tin rõ ràng
                <ArrowRight size={13} />
              </span>
              Xác nhận tình trạng đồ, giá thuê, tiền cọc và giao nhận trước khi
              đồng ý. Hai bên tự thỏa thuận thanh toán.
            </Link>
          </aside>
          <section
            className="public-owner__inventory"
            aria-labelledby="owner-listings-title"
          >
            <div className="public-owner__heading">
              <div>
                <h2 id="owner-listings-title">
                  Đồ cho thuê của {owner.name.split(" ")[0]}
                </h2>
                <p>{listings.length} tin đăng công khai</p>
              </div>
              {rating !== null && (
                <span title="Điểm tổng hợp từ đánh giá trên tin đăng">
                  <Star size={15} fill="currentColor" />
                  <strong>{rating.toFixed(1)}</strong> ({totalReviews})
                </span>
              )}
            </div>
            <div className="public-owner__tools">
              <div
                className="public-owner__tabs"
                aria-label="Trạng thái đồ cho thuê"
              >
                <button
                  type="button"
                  aria-pressed={tab === "available"}
                  disabled={!ready}
                  onClick={() => setTab("available")}
                >
                  Có thể thuê<span>{available.length}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={tab === "rented"}
                  disabled={!ready}
                  onClick={() => setTab("rented")}
                >
                  Đang được thuê<span>{rented.length}</span>
                </button>
              </div>
              <div className="public-owner__search">
                <Search size={17} />
                <input
                  aria-label="Tìm trong tin của chủ đồ"
                  disabled={!ready}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm trong tin đăng"
                  maxLength={160}
                />
              </div>
            </div>
            {displayed.length ? (
              <div className="public-owner__grid">
                {displayed.map((listing) => (
                  <article key={listing.id}>
                    {listing.status === "rented" && (
                      <span className="public-owner__listing-status">
                        <Clock size={13} />
                        Đang được thuê
                      </span>
                    )}
                    <ListingCard listing={listing} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="public-owner__empty">
                <Package size={34} />
                <h3>
                  {query ? "Chưa có tin phù hợp" : "Chưa có đồ trong mục này"}
                </h3>
                <p>
                  {query
                    ? "Thử tên món đồ hoặc khu vực khác."
                    : "Bạn có thể xem mục còn lại hoặc khám phá các chủ đồ khác."}
                </p>
                {query && (
                  <button type="button" onClick={() => setQuery("")}>
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
            )}
            <section
              className="public-owner__ratings"
              aria-labelledby="owner-ratings-title"
            >
              <h2 id="owner-ratings-title">Đánh giá trên tin đăng</h2>
              <p>
                {totalReviews
                  ? `${totalReviews} đánh giá được tổng hợp từ các món đồ của chủ đồ.`
                  : "Chưa có đánh giá công khai trên các tin đăng."}
              </p>
              {rated.map((listing) => (
                <Link key={listing.id} href={`/product/${listing.id}`}>
                  <span>{listing.title}</span>
                  <span>
                    <Star size={13} />
                    {listing.rating.toFixed(1)} · {listing.reviewCount}
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </section>
          </section>
        </div>
      </div>
    </MarketplaceShell>
  );
}
