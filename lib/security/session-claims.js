import {HttpError} from '../server/http.js';
export async function verifiedSessionClaims(account,request,token=null){
 token ||= request.headers.get('authorization')?.replace(/^Bearer /,'')||(await account.client.auth.getSession()).data.session?.access_token;
 if(!token)throw new HttpError(401,'Vui lòng đăng nhập lại.','AUTH_REQUIRED');
 const result=await account.client.auth.getClaims(token);
 if(result.error?.status>=500||result.error?.name==='AuthRetryableFetchError')throw new HttpError(503,'Dịch vụ xác minh phiên đang tạm gián đoạn.');
 if(result.error||!result.data?.claims||result.data.claims.sub!==account.authUser.id)throw new HttpError(401,'Phiên đăng nhập chưa được xác nhận.','AUTH_REQUIRED');
 return result.data.claims;
}
