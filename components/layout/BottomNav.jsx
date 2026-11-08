"use client";
import {useWarmConnection} from '@/components/mobile/useWarmConnection';
import {QUICK_PUBLIC_ROUTES} from '@/lib/mobile/navigation-warm';
import {NavigationFeedback} from '@/components/mobile/NavigationFeedback';
import {useLocale} from '@/components/settings/LocaleProvider';
import {uiText} from '@/lib/i18n/ui';

import { useEffect, useState, useSyncExternalStore } from "react";
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
  MessageCircle,
  Video,
  Camera,
  ShoppingBag,
  Compass,
  HouseHeart,
  MessageCircleMore,
  UserRound,
  PackageCheck,
  Newspaper,
} from "lucide";
import { useAuth } from "@/lib/store";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { useNativeApp } from "@/lib/mobile/useNativeApp";
import { ShortsIcon } from "@/components/ui/ShortsIcon";

const PROFILES = {
  marketplace: (isAuthenticated) => {
    const items = [
      { href: "/", label: "Trang chủ", icon: Home, match: (p) => p === "/" },
      {
        href: "/explore",
        label: "Khám phá",
        icon: Compass,
        match: (p) => p.startsWith("/explore") || p.startsWith("/cashback"),
      },
      {
        href: "/dang-tin",
        label: "Đăng tin",
        icon: Plus,
        match: (p) => p === "/dang-tin" || p === "/lend" || p === "/dashboard/assets/new",
        fab: true,
      },
      {
        href: "/giao-dich",
        label: "Giao dịch",
        icon: ClipboardList,
        match: (p) => p==='/giao-dich'||p.startsWith('/dashboard/orders')||p.startsWith('/dashboard/purchases'),
      },
      {
        href: "/account",
        label: "Tài khoản",
        icon: User,
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
 const {locale}=useLocale(),t=v=>uiText(locale,v);
  const active = item.match(pathname),warmConnection=useWarmConnection();
  const [engaged,setEngaged]=useState(false);
  return (
    <Link
      href={item.href}
      prefetch={QUICK_PUBLIC_ROUTES.has(item.href)?warmConnection:undefined}
      className={`bottom-nav__item ${item.fab ? "bottom-nav__item--post" : ""} ${active ? "is-active" : ""}`.trim()}
      aria-current={active ? "page" : undefined}
      title={t(item.label)}
      data-market-nav="true"
      onPointerEnter={()=>setEngaged(true)}
      onPointerLeave={()=>setEngaged(false)}
      onFocus={()=>setEngaged(true)}
      onBlur={()=>setEngaged(false)}
    >
      <span className="bottom-nav__icon">
        {item.shorts ? <ShortsIcon active={active}/> : <MorphIcon
          icon={active||engaged ? (item.icon===Home?HouseHeart:item.icon===Compass?ShoppingBag:item.icon===MessageCircle?MessageCircleMore:item.icon===User?UserRound:item.icon===Tag?PackageCheck:item.icon) : item.icon}
          size={23}
          strokeWidth={active ? 2.25 : 1.75}
        />}
      </span>
      <span className="bottom-nav__label">{t(item.label)}</span><NavigationFeedback/>
    </Link>
  );
}

function subscribeToHydration() {
  return () => {};
}

export function BottomNav() {
  const native = useNativeApp();
  const pathname = usePathname() || "/";
  const { isAuthenticated } = useAuth();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const profile = resolveProfile(pathname);
  const focused = pathname.startsWith("/shorts") || pathname === "/dashboard/shorts/new" || pathname === '/dashboard/assets/new' || pathname === '/lend' || pathname === '/dashboard/security' || pathname.startsWith('/purchase/') || pathname.startsWith("/dashboard/messages") || pathname.startsWith("/rent/") || pathname.startsWith("/product/") || pathname.startsWith("/dashboard/kyc/verify");
  const nativeItems = PROFILES.marketplace(isAuthenticated).map((item, index) => {
    if (index === 1) return item;
    if (index === 2 && isAuthenticated) return {...item,icon:Plus};
    if (index === 4) return {...item,label:"Tài khoản",icon:User,match:p=>p==="/account"||p.startsWith('/dashboard/profile')||p.startsWith('/dashboard/kyc')};
    return item;
  });
  const items = profile==='admin'?PROFILES.admin(isAuthenticated):native?nativeItems:PROFILES.marketplace(isAuthenticated);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const syncBodyClass = () => {
      document.body.classList.toggle("has-mobile-bottom-nav", native && !focused);
    };

    syncBodyClass();
    mq.addEventListener("change", syncBodyClass);

    return () => {
      mq.removeEventListener("change", syncBodyClass);
      document.body.classList.remove("has-mobile-bottom-nav");
    };
  }, [focused,native]);

  const nav = (
    <nav
      className={`bottom-nav bottom-nav--reloo ${native && profile !== "admin" ? "bottom-nav--native" : ""}`}
      aria-label="Điều hướng di động"
    >
      <div className="bottom-nav__clean-row" style={{gridTemplateColumns:`repeat(${items.length},minmax(0,1fr))`}}>
        {items.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );

  if (!mounted || !native || focused) return null;

  return createPortal(nav, document.body);
}
