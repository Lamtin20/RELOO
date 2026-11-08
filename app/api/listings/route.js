import {requirePreciseLocation} from '@/lib/maps/location-requirement';
import { randomUUID } from "node:crypto";
import { requireAccount } from "@/lib/security/authorization";
import { validateListing } from "@/lib/db/listing-write";
import {marketplaceAsset} from "@/lib/catalog/public-listing";
import {prepareListingImages} from '@/lib/images/listing-media';
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
} from "@/lib/server/http";
export async function POST(request) {
  let prepared;
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, {
      scope: "listing_write",
    });
    const row = validateListing(await readJson(request, 4000000));
    if(typeof row.location_details.street!=='string'||!row.location_details.street.trim()||typeof row.location_details.house!=='string'||!row.location_details.house.trim())throw new HttpError(400,'Nhap duong va so nha hoac dia chi nhan biet.','ADDRESS_REQUIRED');
    row.location_details.preciseLocation=await requirePreciseLocation(row.location_details.preciseLocation,profile.id);
    row.location_details.coords=row.location_details.preciseLocation.coords;
    prepared=await prepareListingImages(row.images,{db,ownerId:profile.id});
    row.images=prepared.urls;
    const { data, error } = await db
      .from("assets")
      .insert({ ...row, id: randomUUID(), owner_id: profile.id })
      .select()
      .single();
    if (error) throw new HttpError(503, "Chưa lưu được tin đăng.");
    return Response.json(
      { ok: true, listing: marketplaceAsset(data,null,{viewerId:profile.id}) },
      { status: 201 },
    );
  } catch (error) {
    if(prepared)await prepared.rollback();
    return errorResponse(error);
  }
}
