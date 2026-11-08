"use client";

import { useState,useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/lib/store";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";
import {RelooLoading} from '@/components/ui/RelooLoading';
import {useLocale} from '@/components/settings/LocaleProvider';
import {surfaceCopy} from '@/lib/i18n/surfaces';

function AccessDenied() {
  const {locale}=useLocale(),t=surfaceCopy[locale]||surfaceCopy['vi-VN'];

  return (
    <div className="access-denied">
      <div className="access-denied__icon">
        <ShieldOff size={32} />
      </div>
      <h1 className="text-display" style={{ fontSize: 22, fontWeight: 700 }}>
        {t.denied}
      </h1>
      <p className="text-muted" style={{ maxWidth: 420 }}>
        {t.deniedBody}
      </p>
      <Link href="/auth?next=%2Fadmin%2Frisk" className="btn btn-primary">{t.adminLogin}</Link>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const { user, hydrated, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const showSwipeBack = pathname !== "/admin";
  useEffect(()=>{
    if(!mobileOpen)return;
    const old=document.body.style.overflow,sidebar=document.getElementById('reloo-admin-sidebar'),media=window.matchMedia('(max-width:700px)');
    document.body.style.overflow='hidden';
    const items=()=>Array.from(sidebar?.querySelectorAll('a[href],button:not(:disabled)')||[]).filter(el=>el.getClientRects().length);
    items()[0]?.focus({preventScroll:true});
    const close=()=>{setMobileOpen(false);document.getElementById('admin-mobile-menu-btn')?.focus()},key=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const links=items(),first=links[0],last=links.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}},resize=e=>{if(!e.matches)close()};
    document.addEventListener('keydown',key);media.addEventListener('change',resize);
    return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);media.removeEventListener('change',resize)};
  },[mobileOpen]);

  if (!hydrated) {
    return (
      <div className="access-denied">
        <RelooLoading/>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className={'admin-shell has-bottom-nav'+(mobileOpen?' admin-shell--menu-open':'')}>
      {mobileOpen&&<button type="button" className="admin-mobile-scrim" aria-label="Đóng menu" onClick={()=>setMobileOpen(false)}/>}
      <SwipeBackHandler enabled={showSwipeBack} fallback="/admin" />
      <AdminSidebar onNavigate={() => setMobileOpen(false)} />
      <div className="admin-main">
        <AdminTopbar onMenuClick={() => setMobileOpen((v) => !v)} menuExpanded={mobileOpen}/>
        <div className="admin-content">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
