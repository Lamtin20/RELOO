import {NextResponse} from 'next/server';
import {requirePermission} from '@/lib/operations/permissions';
import {integrationConfig} from '@/lib/operations/integrations';
import {decryptPrivate,encryptPrivate} from '@/lib/operations/crypto';
import {HttpError,secretMatches} from '@/lib/server/http';
export async function GET(request){const origin=new URL(request.url).origin;try{
 const {profile,db}=await requirePermission(request,'settings.write'),url=new URL(request.url),raw=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('reloo-gmail-oauth='))?.slice(18);
 let grant;try{grant=JSON.parse(decryptPrivate(Buffer.from(raw||'', 'base64url').toString('utf8')));}catch{throw new HttpError(400,'Phiên Gmail không hợp lệ.');}
 if(grant.profileId!==profile.id||grant.expiresAt<Date.now()||grant.redirect!==origin+'/api/crm/gmail/callback'||!secretMatches(url.searchParams.get('state'),grant.state)||!url.searchParams.get('code'))throw new HttpError(400,'Phiên Gmail đã hết hạn hoặc bị hủy.');
 const config=await integrationConfig(db,'GMAIL'),token=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.GMAIL_CLIENT_ID,client_secret:config.GMAIL_CLIENT_SECRET,code:url.searchParams.get('code'),code_verifier:grant.verifier,redirect_uri:grant.redirect,grant_type:'authorization_code'}),signal:AbortSignal.timeout(20000)}),auth=await token.json();
 if(!token.ok||!auth.refresh_token||!auth.access_token||!String(auth.scope).split(' ').includes('https://www.googleapis.com/auth/gmail.send'))throw new HttpError(400,'Chưa cấp đủ quyền Gmail.');
 const identity=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+auth.access_token},signal:AbortSignal.timeout(15000)}),account=await identity.json(),sender=config.sender||'norepy.reloo@gmail.com';
 if(!identity.ok||!account.email_verified||account.email?.toLowerCase()!==sender.toLowerCase())throw new HttpError(400,'Cần dùng đúng Gmail gửi thông báo.');
 const row=await db.from('integration_settings').select('version').eq('provider','GMAIL').maybeSingle();if(row.error)throw new HttpError(503,'Chưa lưu kết nối.');
 const saved=await db.rpc('reloo_save_integration',{p_actor:profile.id,p_provider:'GMAIL',p_version:row.data?.version||0,p_config:{sender},p_secrets:encryptPrivate(JSON.stringify({GMAIL_CLIENT_ID:config.GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET:config.GMAIL_CLIENT_SECRET,GMAIL_REFRESH_TOKEN:auth.refresh_token}))});if(saved.error)throw new HttpError(409,'Cấu hình đã thay đổi.');
 await db.from('automation_jobs').update({status:'QUEUED',attempts:0,run_at:new Date().toISOString()}).eq('kind','EMAIL_NOTIFY').eq('status','FAILED').in('result->>code',['GMAIL_NOT_CONFIGURED','GMAIL_AUTH_REQUIRED']);
 const response=NextResponse.redirect(origin+'/crm?gmail=connected');response.cookies.set('reloo-gmail-oauth','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/crm/gmail',maxAge:0});return response;
 }catch{const response=NextResponse.redirect(origin+'/crm?gmail=not-connected');response.cookies.set('reloo-gmail-oauth','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/crm/gmail',maxAge:0});return response;}}
