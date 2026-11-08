import {branding} from '@/lib/content/branding';
export async function GET(){return Response.json({ok:true,...await branding()},{headers:{'Cache-Control':'no-store'}});}
