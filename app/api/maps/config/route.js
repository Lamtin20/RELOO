import {mapConfiguration} from '@/lib/maps/config';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({ok:true,...mapConfiguration()},{headers:{'Cache-Control':'no-store'}});}
