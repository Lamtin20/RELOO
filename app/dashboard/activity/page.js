"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  PackagePlus,
  Search,
  ShieldCheck,
  UserRound,
  FileCheck2,
} from "lucide-react";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { Money } from "@/components/ui";
import { useSavedListings } from "@/lib/hooks/useSavedListings";
import { ListingImage } from "@/components/listings/ListingImage";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { state } = useReloo();
  const { listings } = useListings({ ownerId: user?.id });
  const { savedIds } = useSavedListings();
  const [mode, setMode] = useState("rent");
  if (!user) return null;
  const threads = (state.chatThreads || []).filter((thread) =>
    mode === "rent" ? thread.buyerId === user.id : thread.lenderId === user.id,
  );
  const available = listings.filter(
    (listing) => listing.status === "available",
  );
  const items =
    mode === "rent"
      ? state.listings
          .filter((listing) => savedIds.includes(listing.id))
          .slice(0, 4)
      : listings.slice(0, 4);
  const active = user.activationStatus === "ACTIVE";
  return (
    <div className="dashboard-page personal-workspace">
      <header className="personal-workspace__heading">
        <div>
          <span className="r-eyebrow">TÀI KHOẢN RELOO CỦA BẠN</span>
          <h1>Chào {user.name.split(" ").slice(-1)[0]},</h1>
          <p>Các món đồ và cuộc trao đổi của bạn, tại một nơi.</p>
        </div>
        <Link href="/lend" className="btn btn-primary">
          <PackagePlus size={17} />
          Đăng tin cho thuê
        </Link>
      </header>
      <div
        className="personal-workspace__modes"
        role="group"
        aria-label="Hoạt động của bạn"
      >
        <button
          type="button"
          aria-pressed={mode === "rent"}
          onClick={() => setMode("rent")}
        >
          <Search size={17} />
          Tôi thuê đồ
        </button>
        <button
          type="button"
          aria-pressed={mode === "lend"}
          onClick={() => setMode("lend")}
        >
          <PackagePlus size={17} />
          Tôi cho thuê
        </button>
      </div>
      <div className="workspace-tools">
        <Link href="/dashboard/profile">
          <UserRound size={19} />
          Hồ sơ & ngân hàng
        </Link>
        <Link href="/dashboard/agreements">
          <FileCheck2 size={19} />
          Thỏa thuận thuê
        </Link>
        <Link href="/dashboard/kyc/verify">
          <ShieldCheck size={19} />
          Xác minh căn cước
        </Link>
      </div>
      <div className="personal-workspace__stats">
        <div>
          <span>{mode === "rent" ? "Tin đã lưu" : "Tin của bạn"}</span>
          <strong>{mode === "rent" ? savedIds.length : listings.length}</strong>
        </div>
        <div>
          <span>Cuộc trao đổi</span>
          <strong>{threads.length}</strong>
        </div>
        <div>
          <span>{mode === "rent" ? "Tài khoản" : "Tin sẵn sàng"}</span>
          <strong className="personal-workspace__stat-text">
            {mode === "rent"
              ? active
                ? "Đã xác minh"
                : "Chờ xác minh"
              : available.length}
          </strong>
        </div>
      </div>
      <div
        className={`personal-workspace__verification ${active ? "is-active" : ""}`}
      >
        <ShieldCheck size={22} />
        <div>
          <strong>
            {active
              ? "Tài khoản đã được xác minh"
              : "Hoàn tất xác minh tài khoản"}
          </strong>
          <p>
            {active
              ? "Xem hồ sơ an toàn và thời hạn xác minh của bạn."
              : "Đăng tin và giao dịch được mở khi hồ sơ đủ điều kiện."}
          </p>
        </div>
        <Link href="/safety">
          Xem hồ sơ <ArrowRight size={15} />
        </Link>
      </div>
      <div className="personal-workspace__columns">
        <section>
          <div className="personal-workspace__section-heading">
            <h2>
              {mode === "rent" ? "Món đồ bạn quan tâm" : "Tin cho thuê của bạn"}
            </h2>
            <Link
              href={mode === "rent" ? "/explore?saved=1" : "/dashboard/assets"}
            >
              Xem tất cả <ArrowRight size={15} />
            </Link>
          </div>
          {items.length ? (
            <div className="personal-listings">
              {items.map((listing) => (
                <Link key={listing.id} href={`/product/${listing.id}`}>
                  <ListingImage images={listing.images} alt={listing.title} />
                  <div>
                    <strong>{listing.title}</strong>
                    <span>
                      <Money amount={listing.dailyPrice} /> / ngày
                    </span>
                    <p>{listing.location}</p>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="personal-workspace__empty">
              <PackagePlus size={28} />
              <h3>
                {mode === "rent"
                  ? "Bạn chưa lưu tin nào"
                  : "Món đồ đầu tiên đang chờ bạn"}
              </h3>
              <p>
                {mode === "rent"
                  ? "Lưu các món đồ để quay lại khi cần thuê."
                  : "Thêm ảnh và đặt giá thuê cho món đồ của bạn."}
              </p>
              <Link href={mode === "rent" ? "/explore" : "/lend"}>
                {mode === "rent" ? "Khám phá đồ thuê" : "Tạo tin cho thuê"}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
        <section>
          <div className="personal-workspace__section-heading">
            <h2>Trao đổi gần đây</h2>
            <Link href="/dashboard/messages">
              Tin nhắn <ArrowRight size={15} />
            </Link>
          </div>
          {threads.length ? (
            <div className="personal-conversations">
              {threads.slice(0, 5).map((thread) => {
                const listing = state.listings.find(
                  (item) => item.id === thread.listingId,
                );
                const counterpart = state.users.find(
                  (item) =>
                    item.id ===
                    (thread.buyerId === user.id
                      ? thread.lenderId
                      : thread.buyerId),
                );
                const last = thread.messages?.at(-1);
                return (
                  <Link
                    key={thread.id}
                    href={`/dashboard/messages?thread=${encodeURIComponent(thread.id)}`}
                  >
                    <span>
                      <MessageCircle size={19} />
                    </span>
                    <div>
                      <strong>{counterpart?.name || "Cuộc trao đổi"}</strong>
                      <p>{listing?.title || "Tin cho thuê"}</p>
                      <small>{last?.text || "Chưa có tin nhắn"}</small>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="personal-workspace__empty">
              <MessageCircle size={28} />
              <h3>Chưa có cuộc trao đổi</h3>
              <p>
                {mode === "rent"
                  ? "Kết nối với chủ đồ từ tin bạn quan tâm."
                  : "Người thuê có thể liên hệ từ tin đăng của bạn."}
              </p>
              <Link href={mode === "rent" ? "/explore" : "/lend"}>
                Bắt đầu <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
      </div>
      <p className="personal-workspace__note">
        <CheckCircle2 size={16} />
        RELOO kết nối người thuê và người cho thuê. Hai bên tự thống nhất tiền
        cọc, thanh toán và giao nhận.
      </p>
    </div>
  );
}
