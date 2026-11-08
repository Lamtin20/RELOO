import { serveShortMedia } from '@/lib/shorts/serve';
export async function GET(request,{params}){const p=await params;return serveShortMedia(request,p.id,p.part);}
export async function HEAD(request,{params}){const p=await params;return serveShortMedia(request,p.id,p.part,true);}
