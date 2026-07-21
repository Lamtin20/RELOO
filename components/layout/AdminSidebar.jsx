"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Headset,
  Target,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  ShieldAlert,
  Leaf,
  Ban,
  LineChart,
  ReceiptText,
  FileSpreadsheet,
  SlidersHorizontal,
  Megaphone,
  Boxes,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "CRM",
    items: [
      { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
      { href: "/admin/users", label: "Người dùng", icon: Users },
      { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
      { href: "/admin/tickets", label: "Tickets CSKH", icon: Headset },
      { href: "/admin/leads", label: "Leads", icon: Target },
    ],
  },
  {
    label: "CMS",
    items: [
      { href: "/admin/cms", label: "Trang nội dung", icon: FileText },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
      { href: "/admin/cms?panel=banner", label: "Banner/Cấu hình", icon: ImageIcon, match: "/admin/cms" },
    ],
  },
  {
    label: "Ops",
    items: [
      { href: "/admin/risk", label: "Risk Ops", icon: ShieldAlert },
      { href: "/admin/risk?tab=audit", label: "Green Audit giám sát", icon: Leaf, match: "/admin/risk" },
      { href: "/admin/users?tab=blacklist", label: "Danh sách đen", icon: Ban, match: "/admin/users" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/finance", label: "Doanh thu", icon: LineChart },
      { href: "/admin/finance?tab=reconcile", label: "Đối soát", icon: ReceiptText, match: "/admin/finance" },
      { href: "/admin/finance?tab=tax", label: "Báo cáo thuế NĐ91", icon: FileSpreadsheet, match: "/admin/finance" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Cài đặt sàn", icon: SlidersHorizontal },
      { href: "/admin/ads", label: "Gói Ads", icon: Megaphone },
      { href: "/admin/listings", label: "Duyệt tin đăng", icon: Boxes },
    ],
  },
];

function isActive(pathname, item) {
  const target = item.match || item.href.split("?")[0];
  if (item.exact) return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function AdminSidebar({ onNavigate }) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <img
          src="/brand/reloo-logo.png"
          alt="RELOO"
          style={{ height: 28, width: "auto" }}
        />
        <div>
          <strong>Admin</strong>
          <small>CMS + CRM Console</small>
        </div>
      </div>

      <nav className="admin-nav">
        {NAV_SECTIONS.map((section) => (
          <div className="admin-nav-group" key={section.label}>
            <div className="admin-nav-group-label">{section.label}</div>
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  className={`admin-nav-link${active ? " admin-nav-link--active" : ""}`}
                >
                  <ItemIcon size={17} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar-foot">
        <Link href="/" className="admin-nav-link">
          ← Về trang sàn
        </Link>
      </div>
    </aside>
  );
}
