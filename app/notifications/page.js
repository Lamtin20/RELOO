"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Settings2, SlidersHorizontal } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { EmptyState } from "@/components/ui";
import { useAuth, useNotifications } from "@/lib/store";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_TABS,
  countUnreadByTab,
  filterNotificationsByCategory,
  filterNotificationsByTab,
  formatNotificationDate,
  getNotificationMeta,
  resolveNotificationLink,
  splitNotificationsByRead,
} from "@/lib/notifications";
import {
  enablePushNotifications,
  isPushSupported,
  needsPushPermissionBanner,
  watchPushPermission,
} from "@/lib/push-notifications";

function NotificationRow({ item, onOpen }) {
  const meta = getNotificationMeta(item.type);
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      className={`notif-row ${item.read ? "notif-row--read" : "notif-row--unread"}`}
      onClick={() => onOpen(item)}
    >
      <span className={`notif-row__icon notif-row__icon--${meta.tone}`}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="notif-row__body">
        <span className="notif-row__head">
          <span className="notif-row__title">{item.title}</span>
          <span className="notif-row__time">{formatNotificationDate(item.createdAt)}</span>
        </span>
        <span className="notif-row__msg">{item.message}</span>
      </span>
    </button>
  );
}

function NotificationSection({ title, items, onOpen }) {
  if (items.length === 0) return null;

  return (
    <section className="notif-section">
      {title ? <h2 className="notif-section__title">{title}</h2> : null}
      <div className="notif-section__list">
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } =
    useNotifications();

  const [tab, setTab] = useState("activity");
  const [filter, setFilter] = useState("all");
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!isPushSupported()) {
      setShowPushBanner(false);
      return;
    }
    setShowPushBanner(needsPushPermissionBanner());
    return watchPushPermission((state) => {
      setShowPushBanner(state !== "granted" && state !== "unsupported");
    });
  }, []);

  const tabCounts = useMemo(() => countUnreadByTab(notifications), [notifications]);

  const filtered = useMemo(() => {
    let result = filterNotificationsByTab(notifications, tab);
    result = filterNotificationsByCategory(result, filter);
    return result;
  }, [notifications, tab, filter]);

  const { unread, read } = useMemo(() => splitNotificationsByRead(filtered), [filtered]);

  async function handleEnablePush() {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      await enablePushNotifications();
      if (isPushSupported() && Notification.permission === "granted") {
        setShowPushBanner(false);
      }
    } finally {
      setPushBusy(false);
    }
  }

  function handleOpen(item) {
    if (!item.read) {
      markNotificationRead(item.id);
    }
    const href = resolveNotificationLink(item.link);
    if (href) router.push(href);
  }

  function handleMarkAllRead() {
    if (user?.id) markAllNotificationsRead(user.id);
  }

  if (!hydrated || !isAuthenticated || !user) {
    return (
      <MarketplaceShell hideHeader>
        <div className="notif-page notif-page--loading">
          <div className="dashboard-spinner" aria-label="Đang tải" />
        </div>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell hideHeader>
      <div className="notif-page">
        <header className="notif-topbar">
          <PageBackButton variant="topbar" fallback="/" showLabel={false} ariaLabel="Quay lại" />
          <h1 className="notif-topbar__title">Thông báo</h1>
          <Link href="/dashboard/profile" className="notif-topbar__settings" aria-label="Cài đặt">
            <Settings2 size={20} />
          </Link>
        </header>

        {showPushBanner && (
          <div className="notif-banner">
            <span className="notif-banner__icon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <p className="notif-banner__text">
              Bật thông báo để không bỏ lỡ cập nhật quan trọng nhé!{" "}
              <button
                type="button"
                className="notif-banner__link"
                onClick={handleEnablePush}
                disabled={pushBusy}
              >
                {pushBusy ? "Đang mở…" : "Cài đặt ngay TẠI ĐÂY"}
              </button>
            </p>
          </div>
        )}

        <div className="notif-tabs" role="tablist" aria-label="Loại thông báo">
          {NOTIFICATION_TABS.map((t) => {
            const count = tabCounts[t.id] ?? 0;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`notif-tabs__item ${active ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {count > 0 && <span className="notif-tabs__badge">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="notif-filters" aria-label="Lọc thông báo">
          {NOTIFICATION_FILTERS.map((chip) => {
            const active = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                className={`notif-filter ${active ? "is-active" : ""}`}
                onClick={() => setFilter(chip.id)}
              >
                {chip.id === "all" && <SlidersHorizontal size={14} aria-hidden="true" />}
                {chip.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="notif-empty panel">
            <EmptyState
              icon="Bell"
              title="Chưa có thông báo"
              description="Các cập nhật đơn thuê, thanh toán và tin tức RELOO sẽ hiển thị tại đây."
            />
          </div>
        ) : (
          <div className="notif-content">
            {unread.length > 0 && (
              <div className="notif-content__head">
                <h2 className="notif-content__label">Thông báo mới</h2>
                <button type="button" className="notif-content__mark-all" onClick={handleMarkAllRead}>
                  Đọc tất cả
                </button>
              </div>
            )}
            <NotificationSection title="" items={unread} onOpen={handleOpen} />
            {read.length > 0 && (
              <NotificationSection title="Trước đó" items={read} onOpen={handleOpen} />
            )}
          </div>
        )}
      </div>
    </MarketplaceShell>
  );
}
