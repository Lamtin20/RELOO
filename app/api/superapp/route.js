import {publicModuleReadiness} from '@/lib/product/modules';
export function GET(){return Response.json({ok:true,modules:publicModuleReadiness(),version:1},{headers:{'Cache-Control':'no-store'}})}
