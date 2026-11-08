import { securityDb } from "@/lib/security/service";
import { requireAccount } from "@/lib/security/authorization";
import { optionalShortProfile,publicShortAllowed } from "@/lib/shorts/access";
import { shortDto } from "@/lib/shorts/dto";
import {
  assertOrigin,
  errorResponse,
  HttpError,
  readJson,
  rateLimit,
} from "@/lib/server/http";
import { validateShort } from "@/lib/shorts/validation";
export async function GET(request) {
  try {
    rateLimit(request,'short-feed',120);
    const db = securityDb(),
      params = new URL(request.url).searchParams,
      profile = await optionalShortProfile(request, db),
      mine = params.get("mine") === "1",
      offset = Number(params.get("offset") || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 10000)
      throw new HttpError(400, "Trang video không hợp lệ.");
    if (mine && !profile)
      throw new HttpError(401, "Đăng nhập để quản lý video.");
    let query = db
      .from("short_videos")
      .select(
        "id,profile_id,media_id,caption,status,version,review_reason,auto_rule_codes,published_at,created_at,profiles!short_videos_profile_id_fkey(name,avatar_url),short_video_products(id,kind,asset_id,title,href,position)",
      )
      .order("created_at", { ascending: false })
      .order("id",{ascending:false})
      .range(offset, offset + 19);
    if (mine) query = query.eq("profile_id", profile.id);
    else query = query.eq("status", "PUBLISHED");
    const id = params.get("id");
    if (id) {
      if (!/^[a-f0-9-]{36}$/i.test(id))
        throw new HttpError(400, "Video không hợp lệ.");
      query = query.eq("id", id);
    }
    const result = await query;
    if (result.error) throw result.error;
    const owners=[...new Set(result.data.map(v=>v.profile_id))],assetIds=[...new Set(result.data.flatMap(v=>v.short_video_products.filter(p=>p.kind==='RENTAL').map(p=>p.asset_id)))];
    const empty={data:[],error:null};
    const [ownerRows,expired,blocked,current,media]=await Promise.all([
      owners.length?db.from('profiles').select('id,status,activation_status,screening_valid_until,deleted_at').in('id',owners):empty,
      owners.length?db.from('verified_identities').select('profile_id').in('profile_id',owners).lte('expires_at',new Date().toISOString()):empty,
      profile?db.from('short_video_blocks').select('blocked_profile_id').eq('profile_id',profile.id):empty,
      assetIds.length?db.from('assets').select('id,title,daily_price,images,status,is_locked').in('id',assetIds):empty,
      result.data.length?db.from('short_video_media').select('id,status,hls_ready,poster_filename,stream_version,duration').in('id',result.data.map(v=>v.media_id)):empty,
    ]);
    if([ownerRows,expired,blocked,current,media].some(r=>r.error))throw Error('SHORT_FEED_UNAVAILABLE');
    const ownerMap=new Map(ownerRows.data.map(p=>[p.id,p])),assets=new Map(current.data.map(p=>[p.id,p])),mediaMap=new Map(media.data.map(m=>[m.id,m]));
    const videos=result.data.filter(row=>mine || mediaMap.get(row.media_id)?.status==='READY'&&publicShortAllowed(ownerMap.get(row.profile_id),expired.data.some(e=>e.profile_id===row.profile_id),blocked.data.some(b=>b.blocked_profile_id===row.profile_id))).map(row=>shortDto(row,mediaMap.get(row.media_id),assets,profile?.id,mine));
    return Response.json(
      {
        ok: true,
        videos,
        nextOffset: result.data.length === 20 ? offset + 20 : null,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, {
        scope: "listing_write",
      }),
      input = validateShort(await readJson(request)),
      result = await db.rpc("reloo_create_short", {
        p_profile: profile.id,
        p_media: input.mediaId,
        p_caption: input.caption,
        p_products: input.products,
        p_draft: input.draft,
      });
    if (result.error)
      throw new HttpError(
        409,
        "Video hoặc sản phẩm không thuộc tài khoản, đã được sử dụng, hoặc thông tin chưa hợp lệ.",
      );
    const saved=await db.from('short_videos').select('status').eq('id',result.data).single();if(saved.error)throw saved.error;
    return Response.json(
      { ok: true, id: result.data, status: saved.data.status },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request) {
  try {
    assertOrigin(request);
    const { profile, db } = await requireAccount(request, { active: false }),
      input = await readJson(request);
    if (
      !/^[a-f0-9-]{36}$/i.test(input.id || "") ||
      !["ARCHIVE", "SUBMIT"].includes(input.action)
    )
      throw new HttpError(400, "Thao tác video không hợp lệ.");
    const result = await db.rpc("reloo_update_short", {
      p_profile: profile.id,
      p_id: input.id,
      p_action: input.action,
    });
    if (result.error)
      throw new HttpError(409, "Chưa đổi được trạng thái video.");
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
