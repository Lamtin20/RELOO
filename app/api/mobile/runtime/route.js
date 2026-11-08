import {webBuild} from '@/lib/mobile/web-build';
export async function GET(){return Response.json({build:await webBuild()},{headers:{'Cache-Control':'no-store'}});}
