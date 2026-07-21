import { NextResponse } from 'next/server';
import { fetchMarketplaceBootstrap } from '@/lib/db/listings';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/** GET /api/db/bootstrap — đồng bộ listings, users, orders từ Supabase */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }

  const result = await fetchMarketplaceBootstrap();

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
