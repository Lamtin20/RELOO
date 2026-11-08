"use client";
import {HeaderWeather} from '@/components/layout/HeaderWeather';
import {useNativeApp} from '@/lib/mobile/useNativeApp';
import {useWarmConnection} from './useWarmConnection';
import {NotificationBell} from '@/components/notifications/NotificationCenter';
import {useLocale} from '@/components/settings/LocaleProvider';
import {uiText} from '@/lib/i18n/ui';
import { useEffect,useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  UserRound,
  Search,
  Settings,
  Heart,
  Package,
  Wallet,
  Plus,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Video,
  Newspaper,
} from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { Logo } from "@/components/brand/Logo";
import { LocationChip } from "@/components/location/LocationChip";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { useAuth, useNotifications } from "@/lib/store";
import { useAccountCompact } from "@/lib/hooks/useAccountCompact";
import { appHeaderProfile } from "@/lib/mobile/header-profile";
const ACTIONS = {
  saved: { href: "/explore?saved=1", label: "Tin đã lưu", icon: Heart },
  settings: {
    href: "/dashboard/profile",
    label: "Cài đặt tài khoản",
    icon: Settings,
    auth: true,
  },
  listings: {
    href: "/dashboard/assets",
    label: "Tin của tôi",
    icon: Package,
    auth: true,
  },
  income: {
    href: "/dashboard/cashflow",
    label: "Thu nhập",
    icon: Wallet,
    auth: true,
  },
  messages: {
    href: "/dashboard/messages",
    label: "Tin nhắn",
    icon: MessageCircle,
    auth: true,
  },
  post: { href: "/lend", label: "Đăng sản phẩm", icon: Plus },
  help: { href: "/help", label: "Trợ giúp", icon: HelpCircle },
  security: {
    href: "/dashboard/security",
    label: "Cài đặt thông báo",
    icon: ShieldCheck,
    auth: true,
  },
  notifications: {
    href: "/notifications",
    label: "Thông báo",
    icon: Bell,
    auth: true,
  },
};
export function AppHeader() {
  const native=useNativeApp();
  const {locale}=useLocale(),t=v=>uiText(locale,v),warmConnection=useWarmConnection();
  const TitleTag=usePathname()?.startsWith('/news')?'span':'h1';
  const pathname = usePathname(),
    router = useRouter(),
    { user, isAuthenticated } = useAuth(),
    { unreadCount } = useNotifications();
  const queryKey=useSearchParams().get('q')||'';
  const [contextTitle,setContextTitle]=useState('');
  useEffect(()=>{
    const update=()=>{const title=[...document.querySelectorAll('[data-header-title],main h1,.app-main h1')].find(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0;});setContextTitle(window.scrollY>120?title?.textContent?.trim().slice(0,110)||'':'');};
    window.addEventListener('scroll',update,{passive:true});window.addEventListener('focusin',update);update();return ()=>{window.removeEventListener('scroll',update);window.removeEventListener('focusin',update);};
  },[pathname]);
  const [searchDraft,setSearchDraft]=useState({key:null,value:''});
  const query=searchDraft.key===queryKey?searchDraft.value:queryKey;
  const setQuery=value=>setSearchDraft({key:queryKey,value});
  const accountCompact = useAccountCompact();
  const profile = appHeaderProfile(pathname || "/"),
    home = pathname === "/",
    action = ACTIONS[profile.action];
  const actionHref =
    action?.auth && !isAuthenticated
      ? "/auth?next=" + encodeURIComponent(action.href)
      : action?.href;
  function search(event) {
    event.preventDefault();
    router.push(
      "/explore" +
        (query.trim() ? "?q=" + encodeURIComponent(query.trim()) : ""),
    );
  }
  return (
    <header className={"native-header native-header--" + profile.tone+(home?" native-header--market-home":"")}>
      <div className="native-header__row">
        {home ? (
          <Logo size={29} />
        ) : (
          <>
            {!profile.primary && (
              <PageBackButton
                variant="topbar"
                showLabel={false}
                fallback={profile.fallback}
              />
            )}
            {pathname === "/account" && accountCompact && user?.avatar && (
              <img
                className="native-header__customer"
                src={user.avatar}
                alt=""
              />
            )}
            <div className="native-header__heading">
              <small>{t(profile.section)}</small>
              <TitleTag className={TitleTag==='span'?'news-header-label':undefined}>
                {pathname === "/account" && accountCompact && user
                  ? user.name
                  : t(contextTitle||profile.title)}
              </TitleTag>
            </div>
          </>
        )}
        {(pathname==='/noi-khu'||pathname==='/explore') && <LocationChip compact />}
        {home&&(isAuthenticated||!native)&&<Link className="native-icon-button native-home-news" href="/news" aria-label={locale==='en-US'?'News':'Tin t\u1ee9c'}><MorphIcon icon={Newspaper} size={22}/></Link>}
        {action && !isAuthenticated && (action.auth || profile.action==='saved') ? <Link className="native-icon-button native-signin" href="/auth" prefetch={warmConnection} aria-label={t('Đăng nhập')}><MorphIcon icon={UserRound} size={23}/></Link> : profile.action === "notifications" ? <NotificationBell className="native-icon-button"/> : action && (
          <Link
            className="native-icon-button"
            href={actionHref}
            aria-label={t(action.label)}
          >
            <MorphIcon icon={action.icon} size={23} />
            {profile.action === "notifications" &&
              isAuthenticated &&
              unreadCount > 0 && (
                <span className="native-unread">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
          </Link>
        )}
        {home&&isAuthenticated&&<Link className="native-icon-button native-home-account" href="/account" aria-label={t('Cá nhân')}>{user?.avatar&&!user.avatar.includes('/brand/reloo-logo')?<img src={user.avatar} alt=""/>:<MorphIcon icon={UserRound} size={22}/>}</Link>}
      </div>
      {home&&<HeaderWeather compact/>}
      {pathname === "/explore" && (
        <form className="native-search" role="search" onSubmit={search}>
          <MorphIcon icon={Search} size={21} />
          <input
            aria-label={t('Tìm sản phẩm trên RELOO')}
            placeholder={t('Bạn đang tìm món đồ nào?')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Tìm</button>
        </form>
      )}
    </header>
  );
}
