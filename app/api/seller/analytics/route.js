import {analyticsError} from '@/lib/analytics/errors';
import {analyticsAccount as requireAccount} from '@/lib/analytics/access';
import {assertOrigin,readJson,errorResponse,HttpError,rateLimit} from '@/lib/server/http';
import {productReport,inspectProduct,campaignLink} from '@/lib/analytics/report';
import {MEASUREMENT,METRICS} from '@/lib/analytics/dictionary';
import QRCode from 'qrcode';
import {encodeWebp} from '@/lib/images/webp';
export async function GET(request){try{const {db,profile}=await requireAccount(request,{active:false});rateLimit(request,'seller-analytics:'+profile.id,30,60000);const q=new URL(request.url).searchParams;const report=await productReport(db,profile.id,q);if(q.get('export')==='csv'){const safe=v=>'"'+String(v??'').replace(/^[=+@-]/,"'").replaceAll('"','""')+'"';const columns=['id','title','status','impressions','clicks','views','viewers','requested','completed'];const body='\ufeff'+columns.join(',')+'\r\n'+report.rows.map(r=>columns.map(k=>safe(r[k])).join(',')).join('\r\n');return new Response(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="reloo-product-analytics.csv"','Cache-Control':'private,no-store'}});}return Response.json({...report,dictionary:METRICS,measurement:MEASUREMENT},{headers:{'Cache-Control':'private,no-store'}});}catch(e){return errorResponse(analyticsError(e));}}
export async function POST(request){try{assertOrigin(request);const {db,profile}=await requireAccount(request,{active:false});rateLimit(request,'seller-analytics-tools:'+profile.id,15,60000);const input=await readJson(request,3000);if(typeof input.asset!=='string'||input.asset.length>150)throw new HttpError(400,'Sản phẩm không hợp lệ.');const {asset,audit}=await inspectProduct(db,profile.id,input.asset);
 if(input.action==='AUDIT')return Response.json({ok:true,audit});
 if(input.action==='CAMPAIGN'){const url=campaignLink(asset.id,input.utm||{}),png=await QRCode.toBuffer(url,{width:480,margin:4,errorCorrectionLevel:'M'}),webp=await encodeWebp(png,{maxEdge:600,quality:95});return Response.json({ok:true,url,qr:'data:image/webp;base64,'+webp.data.toString('base64')});}
 if(input.action==='DRAFT')return Response.json({ok:true,ai:{connected:false,draft:null,reason:'Chưa cấu hình provider/budget riêng cho bản nháp sản phẩm. Không tự gọi API tính phí.'},verifiedFacts:{title:asset.title,description:asset.description}});
 throw new HttpError(400,'Thao tác không hợp lệ.');
 }catch(e){return errorResponse(analyticsError(e));}}
