import { NextResponse } from 'next/server';
import { fetchListingById, fetchProfileById } from '@/lib/db/listings';

/** GET /api/listings/[id] — chi tiết listing + owner */
export async function GET(_request, { params }) {
  const { id } = await params;
  const listing = await fetchListingById(id);

  if (!listing) {
    return NextResponse.json({ ok: false, message: 'Không tìm thấy sản phẩm' }, { status: 404 });
  }

  const owner = await fetchProfileById(listing.ownerId);

  return NextResponse.json({ ok: true, listing, owner });
}
