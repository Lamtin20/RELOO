"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Tag,
  Plus,
  ClipboardList,
  User,
  LayoutDashboard,
  Headphones,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/lib/store";

const PROFILES = {
  marketplace: (isAuthenticated) => {
    const items = [
      { href: "/", label: "Trang chủ", icon: Home, match: (p) => p === "/" },
      {
        href: isAuthenticated ? "/dashboard/assets" : "/auth",
        label: "Quản lý tin",
        icon: Tag,
        match: (p) =>
          p.startsWith("/dashboard/assets") && p !== "/dashboard/assets/new",
      },
      {
        href: isAuthenticated ? "/dashboard/assets/new" : "/auth/register",
        label: "Đăng tin",
        icon: Plus,
        match: (p) => p === "/dashboard/assets/new",
        fab: true,
      },
      {
        href: isAuthenticated ? "/dashboard/orders" : "/auth",
        label: "Đơn thuê",
        icon: ClipboardList,
        match: (p) =>
          p.startsWith("/dashboard/orders") || p.startsWith("/checkout"),
      },
      {
        href: "/account",
        label: isAuthenticated ? "Tài khoản" : "Tài khoản",
        icon: isAuthenticated ? User : LogIn,
        match: (p) =>
          p === "/account" ||
          p.startsWith("/dashboard/profile") ||
          p.startsWith("/dashboard/kyc") ||
          p.startsWith("/dashboard/wallet"),
      },
    ];
    return items;
  },

  dashboard: () => [
    {
      href: "/",
      label: "Trang chủ",
      icon: Home,
      match: (p) => p === "/",
    },
    {
      href: "/dashboard/assets",
      label: "Quản lý tin",
      icon: Tag,
      match: (p) =>
        p.startsWith("/dashboard/assets") && p !== "/dashboard/assets/new",
    },
    {
      href: "/dashboard/assets/new",
      label: "Đăng tin",
      icon: Plus,
      match: (p) => p === "/dashboard/assets/new",
      fab: true,
    },
    {
      href: "/dashboard/orders",
      label: "Đơn thuê",
      icon: ClipboardList,
      match: (p) => p.startsWith("/dashboard/orders"),
    },
    {
      href: "/account",
      label: "Tài khoản",
      icon: User,
      match: (p) =>
        p === "/account" ||
        p.startsWith("/dashboard/profile") ||
        p.startsWith("/dashboard/kyc"),
    },
  ],

  admin: () => [
    {
      href: "/",
      label: "Trang chủ",
      icon: Home,
      match: (p) => p === "/",
    },
    {
      href: "/admin",
      label: "Tổng quan",
      icon: LayoutDashboard,
      match: (p) => p === "/admin",
    },
    {
      href: "/admin/orders",
      label: "Đơn hàng",
      icon: ClipboardList,
      match: (p) => p.startsWith("/admin/orders"),
    },
    {
      href: "/admin/listings",
      label: "Tin đăng",
      icon: Tag,
      match: (p) => p.startsWith("/admin/listings"),
      fab: true,
    },
    {
      href: "/admin/tickets",
      label: "Hỗ trợ",
      icon: Headphones,
      match: (p) => p.startsWith("/admin/tickets"),
    },
  ],
};

function resolveProfile(pathname) {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  return "marketplace";
}

function NavItem({ item, pathname }) {
  const Icon = item.icon;
  const active = item.match(pathname);
  return (
    <Link
      href={item.href}
      className={`bottom-nav__item ${active ? "is-active" : ""}`.trim()}
    >
      <span className="bottom-nav__icon">
        <Icon size={23} strokeWidth={active ? 2.25 : 1.75} />
      </span>
      <span className="bottom-nav__label">{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname() || "/";
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const profile = resolveProfile(pathname);
  const items = PROFILES[profile](isAuthenticated);

  const fab = items.find((i) => i.fab);
  const regular = items.filter((i) => !i.fab);
  const left = regular.slice(0, 2);
  const right = regular.slice(2);
  const fabActive = fab?.match(pathname);

  useEffect(() => {
    setMounted(true);

    const mq = window.matchMedia("(max-width: 900px)");
    const syncBodyClass = () => {
      document.body.classList.toggle("has-mobile-bottom-nav", mq.matches);
    };

    syncBodyClass();
    mq.addEventListener("change", syncBodyClass);

    return () => {
      mq.removeEventListener("change", syncBodyClass);
      document.body.classList.remove("has-mobile-bottom-nav");
    };
  }, []);

  const nav = (
    <nav className="bottom-nav bottom-nav--momo" aria-label="Bottom navigation">
      <div className="bottom-nav__shell">
        <div className="bottom-nav__surface" aria-hidden="true">
          <svg
            className="bottom-nav__shape"
            viewBox="0 0 390 58"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 6C0 2.69 2.69 0 6 0H149c5.2 0 9.9 2.8 12.4 7.3 5.8 9.2 15.8 14.7 26.6 14.7S209 16.5 214.8 7.3C217.3 2.8 222 0 227.2 0H384c3.31 0 6 2.69 6 6v52H0V6Z"
              fill="#ffffff"
            />
          </svg>
        </div>

        {fab && (
          <Link
            href={fab.href}
            className={`bottom-nav__fab ${fabActive ? "is-active" : ""}`}
            aria-label={fab.label}
          >
            <span className="bottom-nav__fab-circle">
              <Plus size={27} strokeWidth={2.6} />
            </span>
            <span className="bottom-nav__fab-pill">{fab.label}</span>
          </Link>
        )}

        <div className="bottom-nav__row">
          <div className="bottom-nav__side">
            {left.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
          <div className="bottom-nav__gap" aria-hidden="true" />
          <div className="bottom-nav__side">
            {right.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );

  if (!mounted) return null;

  return createPortal(nav, document.body);
}
