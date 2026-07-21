import { NextResponse } from 'next/server';
import { checkPolygonConnection, isPolygonApiConfigured } from '@/lib/polygon-api';

/** GET /api/polygon/health — kiểm tra kết nối Polygon (Etherscan v2, chain 137) */
export async function GET() {
  const result = await checkPolygonConnection();

  return NextResponse.json(
    {
      ...result,
      integration: isPolygonApiConfigured() ? 'etherscan-v2' : 'mock',
    },
    { status: result.ok ? 200 : result.configured ? 502 : 503 }
  );
}
