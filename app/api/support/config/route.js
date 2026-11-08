import {securityDb} from '@/lib/security/service';
import {runtimeBrain} from '@/lib/chat-control/runtime';
import {publicBrain} from '@/lib/chat-control/policy';
import {errorResponse,rateLimit} from '@/lib/server/http';
export const dynamic='force-dynamic';
export async function GET(request){try{rateLimit(request,'brain-widget-config',120);return Response.json({ok:true,...publicBrain(await runtimeBrain(securityDb()))},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
