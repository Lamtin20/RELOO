import { NextResponse } from 'next/server';
import { checkSupabaseConnection } from '@/lib/db/connection';

/** GET /api/supabase/health — kiểm tra kết nối & schema Supabase */
export async function GET() {
  const result = await checkSupabaseConnection();

  return NextResponse.json(result, {
    status: result.ok ? 200 : result.configured ? 503 : 503,
  });
}
