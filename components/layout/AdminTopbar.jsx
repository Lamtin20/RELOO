"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, ChevronDown, LogOut, UserCog } from "lucide-react";
import { useAuth, useReloo } from "@/lib/store";
import { PageBackButton } from "@/components/navigation/PageBackButton";

export function AdminTopbar({ onMenuClick }) {
  const pathname = usePathname();
  const showBack = pathname !== "/admin";
  const { user, users, switchUser, logout } = useAuth();
  const { state } = useReloo();
  const [menuOpen, setMenuOpen] = useState(false);

  const unread = useMemo(
    () => (state.notifications || []).filter((n) => n.userId === user?.id && !n.read).length,
    [state.notifications, user?.id]
  );

  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="admin-topbar">
      {showBack && (
        <PageBackButton
          variant="topbar"
          fallback="/admin"
          showLabel={false}
          className="admin-topbar__back"
        />
      )}
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={onMenuClick}
        aria-label="Mở menu"
        style={{ display: "none" }}
        id="admin-mobile-menu-btn"
      >
        <Menu size={18} />
      </button>

      <span className="admin-topbar-title">Bảng điều khiển quản trị</span>

      <div className="admin-topbar-spacer" />

      <button type="button" className="btn btn-ghost btn-icon" aria-label="Thông báo" style={{ position: "relative" }}>
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--danger)",
            }}
          />
        )}
      </button>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="admin-user-chip"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.name} />
            ) : (
              initials
            )}
          </div>
          <div style={{ textAlign: "left", lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name || "Ẩn danh"}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Quản trị viên</div>
          </div>
          <ChevronDown size={14} style={{ color: "var(--muted)" }} />
        </button>

        {menuOpen && (
          <div
            className="panel"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: 260,
              padding: 8,
              zIndex: 200,
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--muted)" }}>
              Chuyển đổi vai trò xem thử (demo)
            </div>
            {users?.map((u) => (
              <button
                key={u.id}
                type="button"
                className="admin-nav-link"
                style={{ width: "100%", justifyContent: "flex-start" }}
                onClick={() => {
                  switchUser(u.id);
                  setMenuOpen(false);
                }}
              >
                <UserCog size={15} />
                {u.name}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{u.role}</span>
              </button>
            ))}
            <div className="divider" style={{ margin: "6px 0" }} />
            <button
              type="button"
              className="admin-nav-link"
              style={{ width: "100%", justifyContent: "flex-start", color: "var(--danger)" }}
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              <LogOut size={15} />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
