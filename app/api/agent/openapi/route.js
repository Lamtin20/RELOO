import {agentOpenApi} from '@/lib/agent/contract';
export function GET(){return Response.json(agentOpenApi,{headers:{'Cache-Control':'public,max-age=300'}})}
