import {iconResponse} from '@/lib/content/icon-response';
export async function GET(request){return iconResponse(new URL(request.url).searchParams.get('kind'));}
