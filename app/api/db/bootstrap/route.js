import { NextResponse } from 'next/server';
import { fetchMarketplaceBootstrap } from '@/lib/db/listings';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {marketplaceViewer} from '@/lib/security/marketplace-viewer';

/** GET /api/db/bootstrap — đồng bộ listings, users, orders từ Supabase */
export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const viewer=await marketplaceViewer(request);
  const result = await fetchMarketplaceBootstrap(viewer.id,viewer.canModerate);

  return NextResponse.json(result, { status: result.ok ? 200 : 503,headers:{'Cache-Control':'private,no-store'} });
}
