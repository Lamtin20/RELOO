"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ClipboardList,
  Leaf,
  Landmark,
  Megaphone,
  ShieldCheck,
  UserCircle,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dashboard/assets", label: "Kho đồ", icon: Package },
  { href: "/dashboard/assets/new", label: "Đăng đồ mới", icon: PlusCircle },
  { href: "/dashboard/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/dashboard/audit", label: "Kiểm tra tình trạng", icon: Leaf },
  { href: "/dashboard/wallet", label: "Tài chính & ký quỹ", icon: Landmark },
  { href: "/dashboard/ads", label: "Quảng cáo", icon: Megaphone },
  { href: "/dashboard/kyc", label: "eKYC / Trust", icon: ShieldCheck },
  { href: "/dashboard/profile", label: "Hồ sơ", icon: UserCircle },
];

function getActiveHref(pathname) {
  const sorted = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.href;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeHref = getActiveHref(pathname);

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng menu" : "Mở menu"}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${open ? "sidebar--open" : ""}`.trim()}>
        <div className="sidebar-brand">
          <Logo size="md" />
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ href, label, icon: ItemIcon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`sidebar-link ${
                href === activeHref ? "sidebar-link--active" : ""
              }`.trim()}
            >
              <ItemIcon size={18} strokeWidth={1.9} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="sidebar-link sidebar-link--muted"
          >
            <ArrowLeft size={18} strokeWidth={1.9} />
            <span>Về trang chợ</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
