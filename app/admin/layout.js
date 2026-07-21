"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/store";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";

function AccessDenied() {
  const { switchUser, user } = useAuth();

  return (
    <div className="access-denied">
      <div className="access-denied__icon">
        <ShieldOff size={32} />
      </div>
      <h1 className="text-display" style={{ fontSize: 22, fontWeight: 700 }}>
        Không có quyền truy cập
      </h1>
      <p className="text-muted" style={{ maxWidth: 420 }}>
        {user
          ? `Tài khoản "${user.name}" (vai trò: ${user.role}) không có quyền truy cập Bảng điều khiển quản trị RELOO.`
          : "Bạn cần đăng nhập với tài khoản quản trị để truy cập khu vực này."}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => switchUser("user_admin")}
      >
        Đăng nhập với tài khoản Admin (demo)
      </button>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const { user, hydrated, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const showSwipeBack = pathname !== "/admin";

  if (!hydrated) {
    return (
      <div className="access-denied">
        <p className="text-muted">Đang tải bảng điều khiển...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="admin-shell has-bottom-nav">
      <SwipeBackHandler enabled={showSwipeBack} fallback="/admin" />
      <AdminSidebar onNavigate={() => setMobileOpen(false)} />
      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setMobileOpen((v) => !v)} />
        <div className="admin-content">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
