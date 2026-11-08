import {randomBytes,createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {requirePermission} from '@/lib/operations/permissions';
import {integrationConfig} from '@/lib/operations/integrations';
import {encryptPrivate} from '@/lib/operations/crypto';
import {assertOrigin,errorResponse,HttpError} from '@/lib/server/http';
export async function POST(request){try{
 assertOrigin(request);const {profile,db}=await requirePermission(request,'settings.write'),config=await integrationConfig(db,'GMAIL');
 if(!config.GMAIL_CLIENT_ID||!config.GMAIL_CLIENT_SECRET)throw new HttpError(503,'Cấu hình OAuth Client ID và Client Secret trong CRM trước khi kết nối Gmail.');
 const origin=new URL(request.url).origin;if(!['https://crm.reloo.vn','https://reloo.vn'].includes(origin))throw new HttpError(400,'Kết nối Gmail từ tên miền RELOO.');
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url'),redirect=origin+'/api/crm/gmail/callback',url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:config.GMAIL_CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:'openid email https://www.googleapis.com/auth/gmail.send',access_type:'offline',prompt:'consent',login_hint:config.sender||'norepy.reloo@gmail.com',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
 const response=NextResponse.json({ok:true,url:url.href});response.cookies.set('reloo-gmail-oauth',Buffer.from(encryptPrivate(JSON.stringify({profileId:profile.id,state,verifier,redirect,expiresAt:Date.now()+600000}))).toString('base64url'),{httpOnly:true,secure:true,sameSite:'lax',path:'/api/crm/gmail',maxAge:600});return response;
 }catch(e){return errorResponse(e);}}
