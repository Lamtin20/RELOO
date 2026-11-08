import {validatePrivateLocation} from './precise-location.js';
import {HttpError} from '../server/http.js';
export async function requirePreciseLocation(value,ownerId,{fresh=true}={}){
 try{return validatePrivateLocation(value,{fresh});}
 catch{throw new HttpError(400,'Cho phép GPS, lấy mẫu có sai số dưới 20 m và chọn điểm giao nhận.','PRECISE_LOCATION_REQUIRED');}
}
