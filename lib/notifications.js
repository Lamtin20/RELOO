import {
  Bell,
  Landmark,
  Megaphone,
  Package,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
  UserRound,
} from "lucide-react";

export const NOTIFICATION_TABS = [
  { id: "activity", label: "Hoạt động" },
  { id: "news", label: "Tin tức" },
];

export const NOTIFICATION_FILTERS = [
  { id: "all", label: "Lọc" },
  { id: "account", label: "Tài khoản" },
  { id: "transaction", label: "Giao dịch" },
  { id: "listing", label: "Tin đăng" },
  { id: "event", label: "Sự kiện" },
];

const TYPE_META = {
  order: { tab: "activity", filter: "transaction", Icon: Package, tone: "blue" },
  message: {tab:'activity',filter:'account',Icon:Bell,tone:'green'},
  interest: {tab:'activity',filter:'listing',Icon:Tag,tone:'green'},
  follow: {tab:'activity',filter:'listing',Icon:UserRound,tone:'blue'},
  news: {tab:'news',filter:'event',Icon:Megaphone,tone:'purple'},
  payment: { tab: "activity", filter: "transaction", Icon: Landmark, tone: "green" },
  risk: { tab: "activity", filter: "transaction", Icon: TriangleAlert, tone: "amber" },
  system: { tab: "activity", filter: "account", Icon: Bell, tone: "slate" },
  kyc: { tab: "activity", filter: "account", Icon: ShieldCheck, tone: "green" },
  account: { tab: "activity", filter: "account", Icon: UserRound, tone: "blue" },
  listing: { tab: "activity", filter: "listing", Icon: Tag, tone: "green" },
  promo: { tab: "news", filter: "event", Icon: Megaphone, tone: "amber" },
  event: { tab: "news", filter: "event", Icon: Sparkles, tone: "purple" },
};

const DEFAULT_META = {
  tab: "activity",
  filter: "account",
  Icon: Bell,
  tone: "slate",
};

export function getNotificationMeta(type) {
  return TYPE_META[type] ?? DEFAULT_META;
}

export function filterNotificationsByTab(notifications, tabId = "activity") {
  return notifications.filter((n) => getNotificationMeta(n.type).tab === tabId);
}

export function filterNotificationsByCategory(notifications, filterId = "all") {
  if (filterId === "all") return notifications;
  return notifications.filter((n) => getNotificationMeta(n.type).filter === filterId);
}

export function countUnreadByTab(notifications) {
  return NOTIFICATION_TABS.reduce((acc, tab) => {
    acc[tab.id] = filterNotificationsByTab(notifications, tab.id).filter((n) => !n.read).length;
    return acc;
  }, {});
}

export function formatNotificationDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(d);
  const dayMonth = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);

  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${label}, ${dayMonth}`;
}

export function resolveNotificationLink(link) {
  if (typeof link!=='string'||!link.startsWith('/')||link.startsWith('//')||/[\\\u0000-\u001f]/.test(link)) return null;
  link=link.replace('/dashboard/orders/neighborhood','/dashboard/orders').replace('/dashboard/assets/neighborhood','/dashboard/assets').replace('/needs/neighborhood','/needs');
  if(link.split('?')[0]==='/notifications'||link.split('?')[0]==='/notifications/neighborhood')return '/?notifications=1';
  if (link.startsWith("/orders/")) {
    return link.replace("/orders/", "/dashboard/orders/");
  }
  if (link.startsWith("/listings")) {
    return link.replace("/listings", "/explore");
  }
  return link;
}

export function splitNotificationsByRead(notifications) {
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);
  return { unread, read };
}
