import {addressCatalog} from '@/lib/profile/address-server';
import {errorResponse,HttpError,rateLimit} from '@/lib/server/http';
export async function GET(request,{params}){try{
 rateLimit(request,'address-catalog',120,60000);
 const {path}=await params;
 if(path.length!==1||!['p','w'].includes(path[0]))throw new HttpError(404,'Không tìm thấy danh mục địa chỉ.');
 let data;
 if(path[0]==='p')data=await addressCatalog.provinces();
 else{const code=Number(new URL(request.url).searchParams.get('province'));if(!Number.isInteger(code)||!(await addressCatalog.provinces()).some(p=>p.code===code))throw new HttpError(400,'Tỉnh/thành phố không hợp lệ.');data=await addressCatalog.wards(code);}
 return Response.json(data,{headers:{'Cache-Control':'public,max-age=3600,stale-while-revalidate=86400'}});
 }catch(e){if(e instanceof HttpError)return errorResponse(e);return Response.json({error:'Chưa tải được danh mục tỉnh/thành. Vui lòng thử lại sau.'},{status:503});}}
