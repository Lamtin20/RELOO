"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Clock,
  ClipboardList,
  Landmark,
  ShieldCheck,
  Megaphone,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Leaf,
  Package,
} from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { useAuth, useOrders } from "@/lib/store";
import { Money } from "@/components/ui";
import { getUserEscrowHolds } from "@/lib/escrow-holds";
import { USER_TERMS } from "@/lib/constants";

const MENU_SECTIONS = [
  {
    title: "Tiện ích",
    items: [
      { href: "/explore?saved=1", label: "Yêu thích", icon: Heart, auth: true },
      { href: "/explore?history=1", label: "Lịch sử xem tin", icon: Clock, auth: true },
      { href: "/dashboard/orders", label: "Đơn thuê / cho thuê", icon: ClipboardList, auth: true },
    ],
  },
  {
    title: "Dịch vụ",
    items: [
      { href: "/dashboard/wallet", label: "Tài chính & ký quỹ", icon: Landmark, auth: true },
      { href: "/dashboard/kyc", label: "Xác thực eKYC", icon: ShieldCheck, auth: true },
      { href: "/dashboard/ads", label: "Đẩy tin quảng cáo", icon: Megaphone, auth: true },
      { href: "/dashboard/audit", label: "Kiểm tra tình trạng", icon: Leaf, auth: true },
    ],
  },
  {
    title: "Khác",
    items: [
      { href: "/dashboard/profile", label: "Cài đặt tài khoản", icon: Settings, auth: true },
      { href: "/help", label: "Trợ giúp", icon: HelpCircle },
      { href: "/cms/rental-guide", label: "Quy trình cho thuê", icon: ClipboardList },
      { href: "/cms/terms", label: "Quy chế hoạt động", icon: Package },
    ],
  },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { orders, getOrderListing } = useOrders({
    userId: isAuthenticated ? user?.id : undefined,
  });

  const walletBalance = user?.walletBalance ?? 0;
  const escrow = user
    ? getUserEscrowHolds(user.id, orders, (order) => {
        const listing = getOrderListing(order);
        return listing?.title ?? order.listingId;
      })
    : null;

  function handleMenuClick(e, item) {
    if (item.auth && !isAuthenticated) {
      e.preventDefault();
      router.push("/auth");
    }
  }

  return (
    <MarketplaceShell>
      <div className="account-page">
        {!isAuthenticated ? (
          <div className="account-promo">
            <div className="account-promo__copy">
              <h2>Thuê đồ xịn, cho thuê sinh lời</h2>
              <p>Đăng nhập cái đã!</p>
            </div>
            <div className="account-promo__actions">
              <Link href="/auth/register" className="btn btn-outline">
                Tạo tài khoản
              </Link>
              <Link href="/auth" className="btn btn-ct">
                Đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="account-profile">
              <img src={user.avatar} alt={user.name} className="account-profile__avatar" />
              <div className="account-profile__info">
                <h2>{user.name}</h2>
                <p>
                  Điểm tin cậy {user.trustScore ?? 0}/1000 · {user.kycLevel}
                </p>
              </div>
              <Link href="/dashboard/profile" className="account-profile__edit">
                Sửa
              </Link>
            </div>

            <div className="account-wallet panel">
              <div>
                <span className="account-wallet__label">{USER_TERMS.RENTAL_BALANCE}</span>
                <Money amount={walletBalance} className="account-wallet__amount" />
              </div>
              <Link href="/dashboard/wallet" className="btn btn-ct btn-sm">
                Rút thu nhập
              </Link>
            </div>

            {escrow?.hasAny && (
              <Link href="/dashboard/wallet#escrow" className="account-escrow panel">
                <div>
                  <span className="account-escrow__label">Tạm giữ tại {USER_TERMS.ESCROW_ACCOUNT.toLowerCase()}</span>
                  <Money
                    amount={escrow.renter.total + escrow.lender.total}
                    className="account-escrow__amount"
                  />
                  <span className="account-escrow__hint text-muted text-xs">
                    {escrow.renter.count > 0 && `${escrow.renter.count} đơn thuê`}
                    {escrow.renter.count > 0 && escrow.lender.count > 0 && " · "}
                    {escrow.lender.count > 0 && `${escrow.lender.count} đơn cho thuê`}
                  </span>
                </div>
                <ChevronRight size={18} className="account-escrow__chev" />
              </Link>
            )}
          </>
        )}

        {MENU_SECTIONS.map((section) => (
          <div key={section.title} className="account-menu-section">
            <h3 className="account-menu-section__title">{section.title}</h3>
            <div className="account-menu panel">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="account-menu__item"
                    onClick={(e) => handleMenuClick(e, item)}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    <ChevronRight size={16} className="account-menu__chev" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isAuthenticated && (
          <button type="button" className="account-logout" onClick={logout}>
            <LogOut size={18} />
            Đăng xuất
          </button>
        )}

        <div className="account-footer-links">
          <Link href="/cms/terms">Quy chế</Link>
          <span>|</span>
          <Link href="/cms/privacy">Bảo mật</Link>
          <span>|</span>
          <Link href="/help">Hỗ trợ</Link>
        </div>
      </div>
    </MarketplaceShell>
  );
}
