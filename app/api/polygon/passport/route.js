import { NextResponse } from 'next/server';
import { getPolygonPassportStatus } from '@/lib/polygon-api';

/** GET /api/polygon/passport?hash=0x... — trạng thái mạng + xác minh hash */
export async function GET(request) {
  const hash = request.nextUrl.searchParams.get('hash') || '';
  const result = await getPolygonPassportStatus(hash);
  return NextResponse.json(result, { status: result.ok ? 200 : result.configured ? 502 : 503 });
}
