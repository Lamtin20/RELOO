import {iconResponse} from '@/lib/content/icon-response';
export const dynamic='force-dynamic';
export async function GET(){return iconResponse('apple');}
