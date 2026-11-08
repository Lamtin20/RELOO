import { authCapabilities } from "@/lib/auth/capabilities";
import {federationClientConfigured} from '@/lib/auth/federation-policy';
import {federationOrigin} from '@/lib/auth/federation-identity';
export async function GET(request) { const central=!!request&&federationClientConfigured(federationOrigin(request));return Response.json(central?{available:true,google:false,emailLogin:false,centralIdentity:true}:await authCapabilities(), { headers: { "Cache-Control": "no-store" } }); }
