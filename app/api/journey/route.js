import { securityDb } from "@/lib/security/service";
import { privateHash } from "@/lib/operations/crypto";
import { assertOrigin, errorResponse, HttpError, readJson, rateLimit } from "@/lib/server/http";
import {analyticsConsent,publicAnalyticsPath,ID} from '@/lib/content/news-measurement';
import {collectProductEvent} from '@/lib/analytics/collection';
import {MEASUREMENT} from '@/lib/analytics/dictionary';
import {analyticsAccount} from '@/lib/analytics/access';
import {measurementCookie} from '@/lib/analytics/order-link';
export async function GET(){return Response.json({enabled:process.env.RELOO_PRODUCT_ANALYTICS_ENABLED==='true',measurement:MEASUREMENT},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request) {
  try {
    assertOrigin(request);if(!analyticsConsent(request.headers.get('cookie')||''))throw new HttpError(403,'Chưa đồng ý thống kê truy cập.');if(request.headers.get('sec-gpc')==='1'||request.headers.get('dnt')==='1')return new Response(null,{status:204});rateLimit(request, "journey", 80);
    const data = await readJson(request, 3000);
    if(data?.schemaVersion===2){
      if(process.env.RELOO_PRODUCT_ANALYTICS_ENABLED!=='true')return new Response(null,{status:204});
      let actor=null,measurementDb=null;try{const account=await analyticsAccount(request);actor=account.profile.id;measurementDb=account.db;}catch(e){if(![401,403].includes(e.status))throw e;}
      const result=await collectProductEvent(request,data,{db:measurementDb||securityDb(),hash:privateHash,actor,test:process.env.NODE_ENV!=='production'});
      return Response.json({ok:true,...result},{headers:result.result==='ACCEPTED'?{'Set-Cookie':measurementCookie(privateHash('JOURNEY_SESSION',data.sessionId),actor,{secure:process.env.NODE_ENV==='production'}),'Cache-Control':'no-store'}:{'Cache-Control':'no-store'}});
    }
    if (data.consent !== true || !/^[a-f0-9-]{36}$/i.test(data.visitorId || "") || !/^[a-f0-9-]{36}$/i.test(data.sessionId || "") || !["PAGE_VIEW", "SEARCH", "ITEM_IMPRESSION", "INQUIRY_START", "INQUIRY_SENT", "AUTH_START", "NAV_CLICK"].includes(data.event) || typeof data.path !== "string" || !/^\/[a-zA-Z0-9/:_-]*$/.test(data.path) || data.path.length > 160) throw new HttpError(400, "Sự kiện không hợp lệ.");
    const category = /^[a-z0-9-]{1,50}$/.test(data.category || "") ? data.category : null;
    const safePath=publicAnalyticsPath(data.path)||(['/product/:id','/user/:id','/shorts/:id','/news/:article','/news/chu-de/:topic'].includes(data.path)?data.path:null);if(!safePath)throw new HttpError(400,'Không đo trang riêng tư.');
    const { error } = await securityDb().from("journey_events").upsert({event_id:ID.test(data.eventId||'')?data.eventId:null,visitor_hash: privateHash("VISITOR", data.visitorId), session_hash: privateHash("JOURNEY_SESSION", data.sessionId), event: data.event, path:safePath, category,event_data:{source:['search','social','email','referral','internal','direct'].includes(data.source)?data.source:'unknown',device:['mobile','tablet','desktop'].includes(data.device)?data.device:'unknown',target:['product','news','explore','needs','listing','inquiry','auth','control','external','other'].includes(data.target)?data.target:'other'}},{onConflict:'event_id',ignoreDuplicates:true});
    if (error) throw new Error("Journey storage unavailable");
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
