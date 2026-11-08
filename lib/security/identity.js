import {accountIdentity} from '../kyc/expiry.js';
import {identityRecordReady} from '../identity-access.js';
import {HttpError} from '../server/http.js';
export function assertIdentity(record,{other=false}={}){
 if(identityRecordReady(record))return;
 const expired=record?.status==='EXPIRED';
 throw new HttpError(403,other?'Bên còn lại cần hoàn tất xác minh danh tính trước khi cho thuê.':expired?'Căn cước đã hết hạn. Vui lòng xác minh lại để thuê hoặc đăng tin.':'Vui lòng hoàn tất xác minh danh tính để thuê, cho thuê hoặc đăng tin.',other?'OTHER_IDENTITY_REQUIRED':expired?'IDENTITY_EXPIRED':'IDENTITY_REQUIRED');
}
export async function requireProfileIdentity(db,id,options){const record=await accountIdentity(db,id);assertIdentity(record,options);return record;}
