"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";

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

export function MarketplaceShell({ children, hideBottomNav, hideHeader }) {
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith("/product/");
  const isUserWallPage = pathname?.startsWith("/user/");
  const shouldHideBottomNav = hideBottomNav ?? isProductPage;
  const shouldHideHeader = hideHeader ?? isUserWallPage;

  const floatingBack = matchPath(pathname, FLOATING_BACK);
  const inlineBack = matchPath(pathname, INLINE_BACK);
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
    };
  }, [shouldHideHeader, pathname]);

  return (
    <>
      <div className={shellClass}>
        <SwipeBackHandler enabled={swipeBack} fallback={backFallback} />
        {floatingBack && (
          <PageBackButton variant="floating" fallback={backFallback} ariaLabel="Quay lại" />
        )}
        {!shouldHideHeader && (
          <>
            <div ref={headerShellRef} className="site-header-shell">
              <Header />
            </div>
            <div className="site-header-spacer" aria-hidden="true" />
          </>
        )}
        <main className="app-main">
          {inlineBack && !floatingBack && (
            <div className="page-back-bar container">
              <PageBackButton variant="inline" fallback={backFallback} />
            </div>
          )}
          {children}
        </main>
        <Footer />
      </div>
      {!shouldHideBottomNav && <BottomNav />}
    </>
  );
}
