"use client";

import Link from "next/link";
import {AccountCountsProvider} from "@/components/dashboard/AccountCounts";
import {AccountNavigation} from "@/components/dashboard/AccountNavigation";
import {RelooLoading} from '@/components/ui/RelooLoading';
import { usePathname,useRouter } from "next/navigation";
import {BannerPlacement} from '@/components/content/BannerPlacement';
import { LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/store";
import { BottomNav } from "@/components/layout/BottomNav";
import { SwipeBackHandler } from "@/lib/hooks/useSwipeBack";
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {MiniAppNavigation} from '@/components/superapp/MiniAppNavigation';
import {miniAppContext} from '@/lib/product/mini-app-navigation';

export default function DashboardLayout(props){return <Suspense><DashboardContent {...props}/></Suspense>}
function DashboardContent({ children }) {
  const router=useRouter();
  const { user, hydrated } = useAuth();
  const pathname = usePathname();
  const params=useSearchParams(),world=miniAppContext(pathname,params.toString());
  const isMessagesPage = pathname?.startsWith("/dashboard/messages");
  const showDashboardBack = pathname !== "/dashboard" && !isMessagesPage;

  if (!hydrated) {
    return (
      <MiniAppNavigation><div className="dashboard-guard">
        <RelooLoading/>
      </div></MiniAppNavigation>
    );
  }

  if (!user && !(isMessagesPage && params.get('support')==='1')) {
    return (
      <MiniAppNavigation><div className="dashboard-guard">
        <div className="dashboard-guard__card panel animate-fade-up">
          <div className="empty-state__icon" style={{ margin: "0 auto" }}>
            <LockKeyhole size={26} strokeWidth={1.75} />
          </div>
          <h2 className="mt-4">Vui lòng đăng nhập</h2>
          <p className="text-muted mt-2">
            Đăng nhập để xem các cuộc trao đổi và quản lý tin cho thuê của bạn.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent(pathname)}`}
            onClick={event=>{event.preventDefault();router.push("/auth?next="+encodeURIComponent(window.location.pathname+window.location.search));}}
            className="btn btn-primary mt-6"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div></MiniAppNavigation>
    );
  }

  return <MiniAppNavigation><AccountCountsProvider><div className={"account-workspace"+(isMessagesPage?" layout-messages":" has-bottom-nav")}>
    <SwipeBackHandler enabled={showDashboardBack} fallback="/dashboard"/>
    {!isMessagesPage&&!world&&<AccountNavigation/>}
    <main className="dashboard-main"><div className="sidebar-content">{pathname==='/dashboard'&&<BannerPlacement placement="dashboard_top"/>}{children}</div></main>
    {!isMessagesPage&&!world&&<BottomNav/>}
  </div></AccountCountsProvider></MiniAppNavigation>;
}
