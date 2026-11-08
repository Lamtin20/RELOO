import {agentManifest} from '@/lib/agent/contract';
export function GET(){return Response.json(agentManifest,{headers:{'Cache-Control':'public,max-age=300'}})}
