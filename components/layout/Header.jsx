"use client";
import {IdentityStatusBadge} from '@/components/profile/IdentityStatus';
import {createPortal} from 'react-dom';
import {NotificationBell} from '@/components/notifications/NotificationCenter';
import {useLocale} from '@/components/settings/LocaleProvider';
import {homeDiscoveryCopy} from '@/lib/i18n/home-discovery';
import {uiText} from '@/lib/i18n/ui';
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calculator,
  Building2,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  ClipboardList,
  Package,
} from "lucide-react";
import {
  Menu as MenuShape,
  X as CloseShape,
  ChevronDown as ChevronDownShape,
  ChevronUp as ChevronUpShape,
  LayoutGrid as GridShape,
  Bell as BellShape,
  BellRing as BellRingShape,
} from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { useAuth, useNotifications } from "@/lib/store";
import { CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/ui";
import { Logo } from "@/components/brand/Logo";
import { LocationChip } from "@/components/location/LocationChip";
import { HeaderWeather } from "./HeaderWeather";
import {accountCopy} from '@/lib/i18n/account';
import {accountSessionCopy} from '@/lib/i18n/account-session';
import './account-session.css';
import {text as neighborhoodText} from '@/lib/neighborhood/content';

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/explore", label: "Khám phá sản phẩm" },
  { href: "/noi-khu", label: neighborhoodText('vi-VN','brand'),icon:Building2 },
  { href: "/dat-phong", label: "Đặt phòng" },
  { href: "/lend", label: "Đăng sản phẩm", icon: Plus },
  { href: "/pricing", label: "Định giá", icon: Calculator },
  { href: "/cashback", label: "Mua sắm hoàn tiền", icon: ShoppingBag },
  { href: "/safety", label: "An toàn", icon: ShieldCheck },
  { href: "/news", label: "Tin tức" },
];
export function Header() {
 const {locale}=useLocale(),t=v=>uiText(locale,v),a=accountCopy[locale]||accountCopy['vi-VN'],st=accountSessionCopy[locale]||accountSessionCopy['vi-VN'];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const compact=['/','/account'].includes(pathname),hc=homeDiscoveryCopy[locale]||homeDiscoveryCopy['vi-VN'];
  const headerRef = useRef(null), accountTriggerRef = useRef(null), accountMenuRef = useRef(null);
  useEffect(()=>{if(menu==='account'&&isAuthenticated)accountMenuRef.current?.querySelector('a')?.focus({preventScroll:true});},[menu,isAuthenticated]);
  useEffect(() => {
    function outside(event) {
      if (!headerRef.current?.contains(event.target)&&!accountMenuRef.current?.contains(event.target)) setMenu(null);
    }
    function escape(event) {
      if (event.key === "Escape") {setMenu(null);if(accountMenuRef.current)accountTriggerRef.current?.focus();}
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  function search(event) {
    event.preventDefault();
    setMenu(null);
    router.push(
      query.trim()
        ? `/explore?q=${encodeURIComponent(query.trim())}`
        : "/explore",
    );
  }
  async function signOut() {
    try {
      await logout();
      setMenu(null);
    } catch {
      setError("Chưa đăng xuất được. Vui lòng thử lại.");
    }
  }
  return (
    <header className={"site-header r-header"+(compact?" r-header--compact":"")} ref={headerRef}>
      <div className="container r-header__top">
        <button
          type="button"
          className="r-header__mobile-menu icon-tool"
          title={menu === "categories" ? "Đóng danh mục" : "Mở danh mục"}
          aria-label={menu === "categories" ? "Đóng danh mục" : "Mở danh mục"}
          aria-expanded={menu === "categories"}
          onClick={() => setMenu(menu === "categories" ? null : "categories")}
        >
          <MorphIcon
            icon={menu === "categories" ? CloseShape : MenuShape}
            size={20}
          />
        </button>
        <Logo size={34} className="r-header__logo" />
        {compact&&<nav className="r-header__primary" aria-label={hc.intent}><Link href="/cms/about">{hc.about}</Link><Link href="/lend">{hc.owner}</Link>{isAuthenticated&&<Link href="/dashboard/orders">{hc.orders}</Link>}</nav>}<div className="r-header__location">
          <LocationChip compact />
        </div>
        {compact?<div className="r-header__home-space"/>:<form className="r-header__search" onSubmit={search} role="search">
          <Search size={18} />
          <input
            aria-label="Tìm đồ trên RELOO"
            placeholder="Tìm máy ảnh, đồ camping, laptop..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" title="Tìm kiếm" aria-label="Tìm kiếm">
            <Search size={17} />
          </button>
        </form>}
        <div className="r-header__actions">
          {!compact&&<HeaderWeather />}
          {isAuthenticated&&<Link href="/dashboard/orders" className="r-header__orders" aria-label={a.orders} title={a.orders}><ClipboardList size={18}/><span>{a.orders}</span></Link>}
          {isAuthenticated&&<Link
            href="/explore?saved=1"
            className="icon-tool r-header__saved"
            title="Tin đã lưu"
            aria-label="Tin đã lưu"
          >
            <Heart size={20} />
          </Link>}
          {isAuthenticated&&<Link
            href={
              isAuthenticated
                ? "/dashboard/messages"
                : "/auth?next=%2Fdashboard%2Fmessages"
            }
            className="icon-tool r-header__messages"
            title="Tin nhắn"
            aria-label="Tin nhắn"
          >
            <MessageCircle size={21} />
          </Link>}
          {isAuthenticated ? (
            <>
              <NotificationBell className="icon-tool r-header__bell"/>
              <button
                type="button"
                className="r-header__account"
                ref={accountTriggerRef}
                aria-controls={menu==='account'?'reloo-account-menu':undefined}
                onClick={() => setMenu(menu === "account" ? null : "account")}
                aria-expanded={menu === "account"}
                aria-label={st.menu}
                title="Tài khoản"
              >
                {user.avatar?<img src={user.avatar} alt="" />:<span className="r-header__avatar-fallback"><UserRound size={20}/></span>}
                <span className="r-header__account-name"><span>{user.name}</span><IdentityStatusBadge/></span>
                <MorphIcon
                  icon={menu === "account" ? ChevronUpShape : ChevronDownShape}
                  size={13}
                />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/register" className="r-header__register">{a.register}</Link>
              <Link
                href="/auth"
                className="r-header__login"
                aria-label="Đăng nhập"
                title="Đăng nhập"
              >
                <UserRound size={18} />
                <span>{t('Đăng nhập')}</span>
              </Link>
            </>
          )}
        </div>
      </div>
      {!compact&&<div className="r-header__nav-row">
        <div className="container">
          <button
            type="button"
            className="r-header__categories"
            aria-expanded={menu === "categories"}
            onClick={() => setMenu(menu === "categories" ? null : "categories")}
          >
            <MorphIcon
              icon={menu === "categories" ? CloseShape : GridShape}
              size={17}
            />{t('Danh mục')}
            <MorphIcon
              icon={menu === "categories" ? ChevronUpShape : ChevronDownShape}
              size={13}
            />
          </button>
          <nav aria-label="Điều hướng chính">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={pathname === item.href ? "is-active" : ""}
              >
                {item.icon && <item.icon size={16} />}
                <span>{item.href==='/dat-phong'?(locale==='en-US'?'Stays':'Đặt phòng'):t(item.label)}</span>
              </Link>
            ))}
          </nav>
          {isAuthenticated&&<Link href="/dashboard/assets" className="r-header__manage">{t('Quản lý tin')} <ChevronDown size={13} /></Link>}
        </div>
      </div>
      }
      {menu === "categories" && (
        <div className="r-header__category-menu container">
          <div className="r-header__category-grid">
            {CATEGORIES.map((category) => (
              <Link
                key={category.id}
                href={`/explore?category=${category.slug}`}
                onClick={() => setMenu(null)}
              >
                <Icon name={category.icon} size="sm" />
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {isAuthenticated && menu === "account" && typeof document!=='undefined' && createPortal(
        <div id="reloo-account-menu" ref={accountMenuRef} className="r-header__account-menu r-header__account-menu--floating">
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.activationStatus==='ACTIVE'?a.active:user?.activationStatus==='PENDING'?a.activationPending:['SUSPENDED','BLOCKED'].includes(user?.activationStatus)?a.suspended:st.account}</span>
          </div>
          {[["/account",a.title,UserRound],["/dashboard/orders",a.orders,ClipboardList],["/dashboard/messages",a.messages,MessageCircle],["/dashboard/assets",a.assets,Package],["/explore?saved=1",a.saved,Heart],["/verify-identity",a.identity,ShieldCheck]].map(([path,label,Icon])=><Link key={path} href={path} onClick={()=>setMenu(null)}><Icon size={17}/>{label}</Link>)}
          {isAdmin && (
            <Link href="/admin/risk" onClick={() => setMenu(null)}>
              <ShieldCheck size={17} />
              {st.admin}
            </Link>
          )}
          <button type="button" onClick={signOut}>
            <LogOut size={17} />
            {a.logout}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>,document.body
      )}
    </header>
  );
}
