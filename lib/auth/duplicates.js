import {HttpError} from '../server/http.js';
export const duplicateError=()=>new HttpError(409,'Thông tin này đã tồn tại ở Reloo. Vui lòng đăng nhập tài khoản đã có hoặc khôi phục tài khoản.','IDENTIFIER_EXISTS');
export async function assertUniqueContact(db,email,phone,authId=null){const r=await db.rpc('reloo_contact_exists',{p_email:email,p_phone:phone,p_auth:authId});if(r.error)throw new HttpError(503,'Chưa kiểm tra được thông tin đăng ký. Hãy thử lại.');if(r.data)throw duplicateError();}
