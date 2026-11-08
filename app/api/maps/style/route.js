import {providerBytes,rewriteStyle} from '@/lib/maps/provider';
export const dynamic='force-dynamic';
export async function GET(){try{const raw=JSON.parse((await providerBytes(process.env.RELOO_MAP_STYLE_URL)).toString('utf8'));return Response.json(rewriteStyle(raw,process.env.RELOO_MAP_STYLE_URL),{headers:{'Cache-Control':'private,max-age=300'}});}catch{return Response.json({ok:false,code:'MAP_PROVIDER_UNAVAILABLE'},{status:503});}}
