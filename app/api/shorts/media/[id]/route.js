import { serveShortMedia } from '@/lib/shorts/serve';
export async function GET(request, { params }) {
  return serveShortMedia(request,(await params).id);
}
export async function HEAD(request,{params}){return serveShortMedia(request,(await params).id,[],true);}
