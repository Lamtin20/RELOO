"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/store";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";
import { Badge } from "@/components/ui";
import { Logo } from "@/components/brand/Logo";

const ROLE_LABELS = {
  admin: "Quản trị viên",
  lender: "Chủ đồ",
  renter: "Người thuê",
  both: "Chủ đồ & Người thuê",
};

export default function DashboardLayout({ children }) {
  const { user, hydrated } = useAuth();
  const pathname = usePathname();
  const isMessagesPage = pathname?.startsWith("/dashboard/messages");
  const showDashboardBack = pathname !== "/dashboard" && !isMessagesPage;

  if (!hydrated) {
    return (
      <div className="dashboard-guard">
        <div className="dashboard-spinner" aria-label="Đang tải" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-guard">
        <div className="dashboard-guard__card panel animate-fade-up">
          <div className="empty-state__icon" style={{ margin: "0 auto" }}>
            <LockKeyhole size={26} strokeWidth={1.75} />
          </div>
          <h2 className="mt-4">Vui lòng đăng nhập</h2>
          <p className="text-muted mt-2">
            Bạn cần đăng nhập để truy cập trang quản lý của RELOO - quản lý kho
            đồ, đơn hàng, thu nhập cho thuê và nhiều hơn nữa.
          </p>
          <Link href="/auth" className="btn btn-primary mt-6">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`layout-sidebar ${isMessagesPage ? "layout-messages" : "has-bottom-nav"}`}>
      <SwipeBackHandler enabled={showDashboardBack} fallback="/dashboard" />
      {!isMessagesPage && <DashboardSidebar />}

      <div className="dashboard-main">
        {!isMessagesPage && (
          <header className="dashboard-topbar">
            {showDashboardBack && (
              <PageBackButton
                variant="topbar"
                fallback="/dashboard"
                showLabel={false}
                className="dashboard-topbar__back"
              />
            )}
            <div className="dashboard-topbar__brand">
              <Logo size="sm" />
            </div>

            <div className="dashboard-topbar__spacer" />

            <div className="dashboard-topbar__user">
              <img
                src={user.avatar}
                alt={user.name}
                className="dashboard-avatar"
              />
              <div className="dashboard-topbar__userinfo">
                <span className="font-semibold text-sm">{user.name}</span>
                <Badge variant="green" className="dashboard-topbar__role">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </div>
            </div>
          </header>
        )}

        <div className="sidebar-content">{children}</div>
      </div>
      {!isMessagesPage && <BottomNav />}
    </div>
  );
}
