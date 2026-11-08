import {requirePreciseLocation} from '@/lib/maps/location-requirement';
import {requireProfileIdentity} from '@/lib/security/identity';
import {rentalRequestText} from '@/lib/rental-request-text';
import {serverRentalQuote} from '@/lib/server/rental-quote';
import { randomUUID } from "node:crypto";
import { requireAccount } from "@/lib/security/authorization";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, {
      scope: "inquiry_write",identity:true,
    });
    const { listingId, text, requestId, selection, quoteDigest, note, locale, privateLocation, shareLocation } = await readJson(request);
    if(shareLocation!==true)throw new HttpError(400,'Xac nhan chia se diem giao nhan voi ben cho thue.','LOCATION_SHARING_REQUIRED');
    const handoverLocation=await requirePreciseLocation(privateLocation,profile.id);
    if(!selection||typeof quoteDigest!=='string'||!/^[a-f0-9]{64}$/.test(quoteDigest))throw new HttpError(400,'Vui lòng chọn đủ ngày giờ và xem lại chi phí trước khi gửi.','DATES_REQUIRED');
    const listing=await db.from('assets').select('id,owner_id,daily_price,category,status,is_locked,dispute_status,listing_data').eq('id',listingId).maybeSingle();
    if(listing.error||!listing.data||listing.data.listing_data?.transactionMode==='SALE')throw new HttpError(400,'Món đồ này chỉ đăng bán. Hãy gửi yêu cầu mua.');
    if (
      typeof listingId !== "string" ||
      listingId.length > 100 ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 6000
    )
      throw new HttpError(400, "Yêu cầu thuê không hợp lệ.");
    await requireProfileIdentity(db,listing.data.owner_id,{other:true});
    let rentalQuote=null;
    if(selection){let computed;try{computed=serverRentalQuote(listing.data,selection);}catch(e){throw new HttpError(400,e.message,e.message);}if(computed.digest!==quoteDigest)return Response.json({ok:false,error:'PRICE_CHANGED',code:'PRICE_CHANGED',...computed},{status:409});rentalQuote=computed.quote;}
    const { data, error } = await db.rpc("reloo_create_inquiry", {
      p_profile_id: profile.id,
      p_listing_id: listingId,
      p_message: {
        id:
          typeof requestId === "string" &&
          /^[a-zA-Z0-9_-]{1,100}$/.test(requestId)
            ? requestId
            : randomUUID(),
        type: "text",
        handoverLocation:{coords:handoverLocation.coords,entranceNote:handoverLocation.entranceNote,source:handoverLocation.source,accuracyClaim:handoverLocation.accuracyClaim},
        text: rentalQuote?rentalRequestText(rentalQuote,typeof note==='string'?note.slice(0,1000):'',locale==='en-US'?'en-US':'vi-VN'):text.trim(),
        ...(rentalQuote?{rentalQuote,quoteDigest}:{}),
      },
    });
    if (error)
      throw new HttpError(
        403,
        "Chưa gửi được yêu cầu. Tài khoản hai bên và tin đăng cần đủ điều kiện giao dịch.",
        "INQUIRY_DENIED",
      );
    return Response.json({ ok: true, ...data });
  } catch (error) {
    return errorResponse(error);
  }
}
