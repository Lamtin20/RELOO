"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  Bell,
  Menu,
  X,
  Heart,
  MessageCircle,
  LayoutGrid,
  PackagePlus,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  UserRoundCheck,
} from "lucide-react";

import { useAuth, useNotifications } from "@/lib/store";
import { CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/ui";
import { Logo } from "@/components/brand/Logo";
import { LocationChip } from "@/components/location/LocationChip";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { SearchBox } from "@/components/search/SearchBox";
import { HeaderRecentChips } from "@/components/layout/HeaderRecentChips";

const QUICK_DEMO_USERS = [
  { id: "user_minh", label: "Minh Nguyễn (Chủ đồ)" },
  { id: "user_lan", label: "Lan Trần (Người thuê)" },
  { id: "user_admin", label: "RELOO Admin" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const showExploreBack = pathname === "/explore";
  const isHome = pathname === "/";
  const { user, isAuthenticated, isAdmin, logout, switchUser } = useAuth();
  const { unreadCount } = useNotifications();

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const categoryRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(query) {
    const q = query.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    setMobileOpen(false);
  }

  function handleSwitchUser(userId) {
    switchUser(userId);
    setUserMenuOpen(false);
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
  }


  return (
    <header
      className={`site-header${showExploreBack ? " site-header--with-back" : ""}${isHome ? " site-header--home" : ""}`}
    >
      <div className="container site-header__inner">
        {showExploreBack && (
          <PageBackButton
            variant="topbar"
            fallback="/"
            showLabel={false}
            className="header-back"
            ariaLabel="Quay lại"
          />
        )}
        <button
          type="button"
          className="header-icon-btn header-hamburger header-hamburger--lead"
          aria-label="Mở menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Logo size="md" className="header-logo" />

        <div className="header-loc-chip header-loc-chip--desktop">
          <LocationChip compact autoRequest />
        </div>

        <SearchBox
          variant="header"
          onSearch={handleSearch}
          className="header-search-wrap"
          placeholder="Tìm sản phẩm..."
        />

        <nav className="header-nav header-nav--desktop">
          <Link href="/explore" className="header-nav__link">
            Khám phá
          </Link>

          <div className="header-nav__item" ref={categoryRef}>
            <button
              type="button"
              className="header-nav__link"
              onClick={() => setCategoryOpen((v) => !v)}
            >
              Danh mục
              <ChevronDown size={14} />
            </button>
            {categoryOpen && (
              <div className="header-dropdown header-dropdown--categories">
                <div className="header-dropdown__grid">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/explore?category=${cat.slug}`}
                      className="header-dropdown__link"
                      onClick={() => setCategoryOpen(false)}
                      title={cat.name}
                    >
                      <span className="header-dropdown__icon">
                        <Icon name={cat.icon} size="sm" />
                      </span>
                      <span className="header-dropdown__label">{cat.name}</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/explore"
                  className="header-dropdown__all"
                  onClick={() => setCategoryOpen(false)}
                >
                  Xem tất cả danh mục
                </Link>
              </div>
            )}
          </div>

          <Link href="/dashboard/assets/new" className="header-nav__link">
            Cho thuê
          </Link>
          <Link href="/dashboard/orders" className="header-nav__link">
            Đơn hàng
          </Link>
        </nav>

        <div className="header-actions">
          <Link
            href={isAuthenticated ? "/dashboard/messages" : "/auth"}
            className="header-icon-btn header-chat"
            aria-label="Trao đổi liên hệ"
            title="Trao đổi với người thuê / cho thuê"
          >
            <MessageCircle size={19} />
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                href="/notifications"
                className="header-icon-btn header-icon-btn--notif header-notif"
                aria-label="Thông báo"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="header-bell__badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="header-nav__item header-nav__item--user header-user-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className="header-user"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  onClick={() => {
                    setUserMenuOpen((v) => !v);
                    setMobileOpen(false);
                  }}
                >
                  <img src={user.avatar} alt={user.name} className="header-user__avatar" />
                  <div className="header-user__info">
                    <span className="header-user__name">{user.name}</span>
                  </div>
                  <ChevronDown size={14} className="header-user__chev" />
                </button>

                {userMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="header-user-menu-backdrop"
                      aria-label="Đóng menu"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="header-user-menu">
                    <div className="header-user-menu__header">
                      <img src={user.avatar} alt={user.name} />
                      <div>
                        <div className="header-user__name">{user.name}</div>
                        <div className="header-user__role">
                          Trust Score {user.trustScore ?? 0}/1000
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/account"
                      className="header-user-menu__item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserRoundCheck size={15} /> Tài khoản của tôi
                    </Link>
                    <Link
                      href="/explore?saved=1"
                      className="header-user-menu__item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Heart size={15} /> Yêu thích
                    </Link>
                    <Link
                      href="/dashboard"
                      className="header-user-menu__item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} /> Trang quản lý
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="header-user-menu__item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <ShieldCheck size={15} /> Quản trị hệ thống
                      </Link>
                    )}

                    <div className="header-user-menu__divider" />
                    <div className="header-user-menu__section-label">
                      Chuyển vai trò demo
                    </div>
                    {QUICK_DEMO_USERS.map((demo) => (
                      <button
                        key={demo.id}
                        type="button"
                        className={`header-user-menu__item ${
                          user.id === demo.id ? "header-user-menu__item--active" : ""
                        }`}
                        onClick={() => handleSwitchUser(demo.id)}
                      >
                        <UserRoundCheck size={15} /> {demo.label}
                      </button>
                    ))}

                    <div className="header-user-menu__divider" />
                    <button
                      type="button"
                      className="header-user-menu__item header-user-menu__item--danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <Link href="/auth" className="btn btn-primary btn-sm header-login-btn">
              Đăng nhập
            </Link>
          )}

        </div>
      </div>

      <HeaderRecentChips onSelect={handleSearch} />

      {mobileOpen && (
        <div className="header-mobile-panel">
          <div className="header-mobile-panel__brand">
            <Logo size="sm" />
            <div className="header-loc-chip">
              <LocationChip compact autoRequest />
            </div>
          </div>
          <div className="header-mobile-panel__links">
            <Link
              href="/explore"
              className="header-mobile-panel__link"
              onClick={() => setMobileOpen(false)}
            >
              <LayoutGrid size={17} /> Khám phá
            </Link>
            <Link
              href="/dashboard/assets/new"
              className="header-mobile-panel__link"
              onClick={() => setMobileOpen(false)}
            >
              <PackagePlus size={17} /> Cho thuê
            </Link>
            <Link
              href="/dashboard/orders"
              className="header-mobile-panel__link"
              onClick={() => setMobileOpen(false)}
            >
              <ClipboardList size={17} /> Đơn thuê
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard/messages"
                className="header-mobile-panel__link"
                onClick={() => setMobileOpen(false)}
              >
                <MessageCircle size={17} /> Trao đổi liên hệ
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="header-mobile-panel__link"
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard size={17} /> Trang quản lý
              </Link>
            )}
            {!isAuthenticated && (
              <Link
                href="/auth"
                className="header-mobile-panel__link"
                onClick={() => setMobileOpen(false)}
              >
                <UserRoundCheck size={17} /> Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
