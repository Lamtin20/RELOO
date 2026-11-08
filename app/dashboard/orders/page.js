"use client";

import {useLocale} from '@/components/settings/LocaleProvider';
import {text as rentalText} from '@/lib/neighborhood/content';
import {Neighborhood} from '@/components/neighborhood/Neighborhood';
import {RelooLoading} from '@/components/ui/RelooLoading';
import {OrderWorkspace,OrderScopeTabs} from "@/components/dashboard/OrderWorkspace";
import {useAccountCounts} from "@/components/dashboard/AccountCounts";
import {ORDER_BUCKETS} from "@/lib/dashboard/workspace";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/store";
import { Money, EmptyState, Badge } from "@/components/ui";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/utils";


const EMPTY_COPY = {
  all: {
    title: "Chưa có đơn trong bộ lọc này",
    description: "Các đơn thuê và cho thuê của bạn sẽ hiển thị tại đây.",
  },
  active: {
    title: "Không có đơn đang thuê",
    description: "Chưa có đơn nào đang trong quá trình thuê hoặc cho thuê.",
  },
  completed: {
    title: "Chưa có đơn hoàn tất",
    description: "Các đơn đã trả đồ và đối soát xong sẽ nằm ở đây.",
  },
  overdue: {
    title: "Không có đơn quá hạn",
    description: "Bạn không có đơn nào quá hạn trả — mọi thứ đang đúng hẹn.",
  },
};

function OrdersPageInner() {
  const {locale}=useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab");
  const { user, users } = useAuth();

  const {loading:countLoading,counts:globalCounts,error:countsError}=useAccountCounts();
  const activeTab=ORDER_BUCKETS.some(([id])=>id===paramTab)?paramTab:'all';
  const tabCounts=Object.fromEntries(ORDER_BUCKETS.map(([id])=>[id,globalCounts["orders."+id]]));
  const page=Number(searchParams.get('page')||1),actor=user?.id;
  const [result,setResult]=useState({actor:null,orders:[],loading:true,error:'',hasMore:false}),[reload,setReload]=useState(0);
  useEffect(()=>{if(!actor)return;const c=new AbortController();const timer=setTimeout(async()=>{setResult(r=>({...r,actor,loading:true,error:''}));try{const response=await fetch('/api/dashboard/orders?'+new URLSearchParams({tab:activeTab,page:String(page)}),{cache:'no-store',signal:AbortSignal.any([c.signal,AbortSignal.timeout(12000)])});const d=await response.json();if(!response.ok)throw Error(d.error||'Chưa tải được đơn.');if(!c.signal.aborted)setResult({...d,actor,loading:false,error:''});}catch(e){if(!c.signal.aborted)setResult({actor,orders:[],loading:false,error:e.message,hasMore:false});}},0);return()=>{clearTimeout(timer);c.abort();};},[actor,activeTab,page,reload]);
  const filtered=result.actor===actor?result.orders:[],getOrderListing=order=>order.listing;
  const listLoading=result.actor!==actor||result.loading;

  if (!user) return null;
  if(searchParams.get("order"))return <><OrderWorkspace/><Neighborhood key={searchParams.get("order")} initialTab="orders" workspace embedded/></>;

  function selectTab(nextTab) {
    const qs = nextTab === "all" ? "" : `?tab=${nextTab}`;
    router.replace(`/dashboard/orders${qs}`, { scroll: false });
  }

  const getCounterpartyName = (order) => {
    const counterpartyId =
      order.renterId === user.id ? order.lenderId : order.renterId;
    return users.find((u) => u.id === counterpartyId)?.name ?? "-";
  };

  const empty = EMPTY_COPY[activeTab] ?? EMPTY_COPY.all;

  return (
    <div className="dashboard-page animate-fade-up">
      <OrderWorkspace/>
      <div className="aw-orders-toolbar"><h2>Tất cả đơn thuê</h2><span>Tổng số: {countLoading?'…':globalCounts.ordersTotal??'—'}</span></div>
      <OrderScopeTabs tabs={ORDER_BUCKETS} active={activeTab} onChange={selectTab} counts={tabCounts} loading={countLoading}/>
      {listLoading?<RelooLoading/>:result.error?<div className="aw-count-error" role="alert">{result.error}<button onClick={()=>setReload(n=>n+1)}>Thử lại</button></div>:filtered.length === 0 ? (
        <div className="panel mt-6">
          <EmptyState
            icon="ClipboardX"
            title={empty.title}
            description={empty.description}
          />
        </div>
      ) : (
        <div key={activeTab} className="dashboard-order-cards mt-6">
          {filtered.map((order) => {
            const listing = getOrderListing(order);
            const role = order.renterId === user.id ? "Thuê từ" : "Cho thuê tới";
            return (
              <Link
                key={(order.source||"standard")+order.id}
                href={order.source==="scheduled"?`/dashboard/orders?order=${encodeURIComponent(order.id)}`:`/dashboard/orders/${order.id}`}
                className="panel dashboard-order-card panel-interactive"
              >
                <div
                  className="dashboard-order-card__image"
                  style={{
                    backgroundImage: listing?.images?.[0]
                      ? `url(${listing.images[0]})`
                      : undefined,
                  }}
                />
                <div className="dashboard-order-card__body">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold dashboard-order-card__title">
                      {listing?.title ?? order.id}
                    </span>
                    {order.source==="scheduled"?<Badge variant={order.overdue?"danger":"muted"}>{rentalText(locale,order.overdue?"overdue":order.status)}</Badge>:<StatusBadge status={order.status} />}
                  </div>
                  <p className="text-xs text-muted mt-1 dashboard-order-card__meta">
                    <span className="dashboard-order-card__id">{order.id}</span>
                    <span aria-hidden="true"> · </span>
                    {role} {getCounterpartyName(order)}
                  </p>
                  <div className="flex items-center justify-between mt-3 gap-3">
                    <span className="text-xs text-muted">
                      {order.startDate ? formatDate(order.startDate) : "-"} –{" "}
                      {order.endDate ? formatDate(order.endDate) : "-"}
                    </span>
                    <Money amount={order.grandTotal} className="font-semibold" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {!listLoading&&!result.error&&<div className="aw-pagination"><button disabled={page<=1} onClick={()=>router.replace('/dashboard/orders?'+new URLSearchParams({tab:activeTab,page:String(page-1)}))}>Trang trước</button><span>Trang {page} · tối đa 30 đơn / trang</span><button disabled={!result.hasMore} onClick={()=>router.replace('/dashboard/orders?'+new URLSearchParams({tab:activeTab,page:String(page+1)}))}>Trang tiếp</button></div>}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-page">
          <div className="panel mt-6 p-8 text-center text-muted">Đang tải đơn hàng…</div>
        </div>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}
