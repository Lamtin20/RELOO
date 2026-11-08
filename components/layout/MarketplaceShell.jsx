"use client";

import { useEffect, useRef, useSyncExternalStore, Suspense } from "react";
import {useId} from 'react';
import {useLocale} from '@/components/settings/LocaleProvider';
import { usePathname,useSearchParams } from "next/navigation";
import {MiniAppNavigation} from '@/components/superapp/MiniAppNavigation';
import {miniAppContext} from '@/lib/product/mini-app-navigation';
import {MarketplaceDataNotice} from '@/components/mobile/MarketplaceDataNotice';
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";
import { AccountStatusBanner } from "@/components/security/AccountStatusBanner";
import {BannerPlacement} from '@/components/content/BannerPlacement';
import { useNativeApp } from "@/lib/mobile/useNativeApp";
import { AppHeader } from "@/components/mobile/AppHeader";

function matchPath(pathname, patterns) {
  if (!pathname) return false;
  return patterns.some((p) => (typeof p === "string" ? pathname === p : p.test(pathname)));
}

const FLOATING_BACK = [/^\/product\//, /^\/checkout\//];
const INLINE_BACK = [
  /^\/auth/,
  /^\/help$/,
  /^\/account$/,
  /^\/cms\//,
  /^\/welcome$/,
];
const SWIPE_BACK = [...FLOATING_BACK, ...INLINE_BACK];
const subscribeReadiness=()=>()=>{};

export function MarketplaceShell(props){return <Suspense><MarketplaceShellContent {...props}/></Suspense>}
function MarketplaceShellContent({ children, hideBottomNav, hideHeader,hideFooter,hideBack=false }) {
  const native = useNativeApp();
  const mainId=useId(),{locale}=useLocale();
  const ready=useSyncExternalStore(subscribeReadiness,()=>true,()=>false);
  const pathname = usePathname();
  const params=useSearchParams(),world=miniAppContext(pathname,params.toString());
  const isProductPage = pathname?.startsWith("/product/");
  const isUserWallPage = pathname?.startsWith("/user/");
  const shouldHideBottomNav = !native || !!world || (hideBottomNav ?? isProductPage);
  const shouldHideHeader = !!world || (hideHeader ?? (isUserWallPage || (native && isProductPage)));

  const floatingBack = !hideBack && matchPath(pathname, FLOATING_BACK);
  const inlineBack = !hideBack && matchPath(pathname, INLINE_BACK);
  const swipeBack = matchPath(pathname, SWIPE_BACK);

  const backFallback =
    pathname?.startsWith("/product/") || pathname?.startsWith("/checkout/")
      ? "/explore"
      : "/";

  const shellClass = [
    "app-shell",
    shouldHideBottomNav ? "app-shell--immersive" : "has-bottom-nav",
    shouldHideHeader ? "app-shell--no-header" : "",
    isProductPage ? "app-shell--product-page" : "",
    isUserWallPage ? "app-shell--user-wall" : "",
    pathname === "/" ? "app-shell--home" : "",
    pathname === "/explore" ? "app-shell--explore" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const headerShellRef = useRef(null);

  useEffect(() => {
    const el = headerShellRef.current;
    if (!el || shouldHideHeader) {
      document.documentElement.style.removeProperty("--site-header-offset");
      return undefined;
    }

    const syncHeaderOffset = () => {
      const previous=Number.parseInt(document.documentElement.style.getPropertyValue('--site-header-space'))||0;
      document.documentElement.style.setProperty('--site-header-space',`${Math.max(previous,el.offsetHeight)}px`);
      document.documentElement.style.setProperty(
        "--site-header-offset",
        `${el.offsetHeight}px`,
      );
    };

    syncHeaderOffset();
    const observer = new ResizeObserver(syncHeaderOffset);
    observer.observe(el);
    window.addEventListener("resize", syncHeaderOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderOffset);
      document.documentElement.style.removeProperty("--site-header-offset");
      document.documentElement.style.removeProperty('--site-header-space');
    };
  }, [shouldHideHeader, pathname]);

  return (
    <MiniAppNavigation>
      <div className={shellClass}>
        <a className="reloo-skip-link" href={'#'+mainId} onClick={()=>document.getElementById(mainId)?.focus({preventScroll:true})}>{locale==='en-US'?'Skip to main content':'Bỏ qua điều hướng'}</a>
        <SwipeBackHandler enabled={swipeBack} fallback={backFallback} />
        {floatingBack && (
          <PageBackButton variant="floating" fallback={backFallback} ariaLabel="Quay lại" />
        )}
        {!shouldHideHeader && (
          <>
            <div ref={headerShellRef} className={'site-header-shell'+(/^\/(news\/|cms\/|account\/calendar|needs)/.test(pathname||'')?' site-header-shell--context-static':'')}>
              {native ? <AppHeader/> : <><div className="desktop-market-header"><Header/></div><div className="mobile-market-header"><AppHeader/></div></>}
            </div>
            <div className="site-header-spacer" aria-hidden="true" />
          </>
        )}
        <main id={mainId} tabIndex={-1} data-reloo-ready={ready} className="app-main">
          {pathname!=='/shorts'&&!isProductPage&&<AccountStatusBanner />}
          {{'/explore':'explore_top','/lend':'lend_top','/cashback':'cashback_top'}[pathname]&&<div className="container"><BannerPlacement placement={{'/explore':'explore_top','/lend':'lend_top','/cashback':'cashback_top'}[pathname]}/></div>}
          {inlineBack && !floatingBack && !native && !hideBack && (
            <div className="page-back-bar container">
              <PageBackButton variant="inline" fallback={backFallback} />
            </div>
          )}
          {['/','/explore'].includes(pathname)&&<MarketplaceDataNotice/>}
          {children}
        </main>
        {!hideFooter&&!native&&pathname==='/'&&<Footer />}
      </div>
      {!shouldHideBottomNav && <BottomNav />}
    </MiniAppNavigation>
  );
}
