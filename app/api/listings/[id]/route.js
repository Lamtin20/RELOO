import {needsPrivateAddressRefresh} from '@/lib/server/listing-privacy';
import {marketplaceAsset} from '@/lib/catalog/public-listing';
import {marketplaceViewer} from '@/lib/security/marketplace-viewer';
import { NextResponse } from 'next/server';
import { fetchListingById, fetchProfileById } from '@/lib/db/listings';
import { requireAccount } from '@/lib/security/authorization';
import { validateListing } from '@/lib/db/listing-write';
import {prepareListingImages} from '@/lib/images/listing-media';
import { assertOrigin, errorResponse, HttpError, readJson } from '@/lib/server/http';

/** GET /api/listings/[id] — chi tiết listing + owner */
export async function GET(_request, { params }) {
  const { id } = await params;
  const viewer=await marketplaceViewer(_request);
  const listing = await fetchListingById(id,viewer.id,viewer.canModerate);

  if (!listing) {
    return NextResponse.json({ ok: false, message: 'Không tìm thấy sản phẩm' }, { status: 404 });
  }

  const owner = await fetchProfileById(listing.ownerId);

  return NextResponse.json({ ok: true, listing, owner },{headers:{'Cache-Control':'private,no-store'}});
}

export async function PUT(request,{params}) {
  let prepared;
  try {
    assertOrigin(request); const {id}=await params;const {profile,db}=await requireAccount(request,{scope:'listing_write'});
    const {data:existing,error:readError}=await db.from('assets').select('owner_id,is_locked,status,listing_data,images,location_details,location').eq('id',id).maybeSingle();
    if(readError||!existing||existing.owner_id!==profile.id||existing.is_locked||existing.status==='rented')throw new HttpError(403,'Bạn chưa có quyền chỉnh sửa tin đăng này.');
    if(existing.listing_data?.saleStatus==='SOLD')throw new HttpError(409,'Món đồ đã được bán. Tạo tin mới nếu bạn có món đồ khác.');
    const incoming=await readJson(request,4000000);
    if(!Object.hasOwn(incoming,'locationDetails')){incoming.locationDetails=existing.location_details||{};incoming.location=existing.location||'';}
    if(needsPrivateAddressRefresh(existing,incoming))throw new HttpError(409,'Vui lòng tải lại thông tin riêng của món đồ trước khi đổi địa chỉ.','PRIVATE_LOCATION_REFRESH_REQUIRED');
    const changes=validateListing({...existing.listing_data,...incoming});
    prepared=await prepareListingImages(changes.images,{db,ownerId:profile.id,existing:existing.images||[]});
    changes.images=prepared.urls;
    changes.listing_data={...existing.listing_data,...changes.listing_data};
    const {data,error}=await db.from('assets').update(changes).eq('id',id).eq('owner_id',profile.id).select().single();
    if(error)throw new HttpError(503,'Chưa lưu được thay đổi tin đăng.');
    return Response.json({ok:true,listing:marketplaceAsset(data,null,{viewerId:profile.id})});
  }catch(error){if(prepared)await prepared.rollback();return errorResponse(error);}
}
