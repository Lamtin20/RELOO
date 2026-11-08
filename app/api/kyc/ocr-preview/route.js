import {previewIdentity} from '@/lib/kyc/preview';
import {requireAccount} from '@/lib/security/authorization';
import {errorResponse} from '@/lib/server/http';
import {publicBusiness} from '@/lib/operations/settings';
import {identityControllerReady} from '@/lib/privacy/identity-policy';
export async function POST(request){return previewIdentity(request,{ocr:true});}
export async function GET(request){try{const {db}=await requireAccount(request,{active:false});const business=await publicBusiness(db);return Response.json({enabled:process.env.RELOO_KYC_OCR_COMPARISON==='1'&&process.env.RELOO_DATA_REGION==='VN'&&identityControllerReady(business.entity)},{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e)}}
