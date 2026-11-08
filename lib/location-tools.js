export function mapLocation({coords,address=''}={}){
 const valid=Number.isFinite(coords?.lat)&&Number.isFinite(coords?.lng)&&Math.abs(coords.lat)<=90&&Math.abs(coords.lng)<=180;
 const query=valid?coords.lat.toFixed(6)+','+coords.lng.toFixed(6):typeof address==='string'?address.trim().slice(0,300):'';
 if(!query)return null;
 return {embed:'https://www.google.com/maps?q='+encodeURIComponent(query)+'&z='+(valid?15:13)+'&output=embed',external:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query)};
}
export function mapAppUrl(target,platform='google'){
 const map=mapLocation(target);if(!map)return null;
 if(platform!=='apple')return map.external;
 const query=new URL(map.external).searchParams.get('query');
 return 'https://maps.apple.com/?q='+encodeURIComponent(query);
}
export function googleMapsLocation(coords){
 if(!coords||!Number.isFinite(coords.lat)||!Number.isFinite(coords.lng)||Math.abs(coords.lat)>90||Math.abs(coords.lng)>180)return null;
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(coords.lat.toFixed(6)+','+coords.lng.toFixed(6));
}
const vi={accuracy:'Độ chính xác ước tính',estimate:'Tỉnh/thành được gợi ý theo khoảng cách, không phải ranh giới hành chính đã xác minh. Vui lòng kiểm tra trước khi áp dụng.',map:'Mở vị trí trên Google Maps',free:'GPS dùng quyền vị trí thiết bị, không gọi API bản đồ trả phí. Chỉ gửi tọa độ sang Google khi bạn mở bản đồ.',analytics:'RELOO dùng thống kê nội bộ và Google Analytics khi bạn đồng ý. Không gửi số điện thoại, email hoặc GPS chính xác; dữ liệu Google Analytics được Google xử lý ngoài hệ thống RELOO.'};
const en={accuracy:'Estimated accuracy',estimate:'Province/city is a distance-based suggestion, not a verified administrative boundary. Please confirm before applying.',map:'Open location in Google Maps',free:'GPS uses device permission, without a paid maps API. Coordinates are shared with Google only when you open the map.',analytics:'With your consent RELOO uses internal measurement and Google Analytics. Phone numbers, email and precise GPS are not sent; Google processes Analytics data outside RELOO.'};
export const locationText=(locale,key)=>(locale==='en-US'?en:vi)[key]||key;
vi.free='GPS chỉ được lấy khi bạn chọn dùng vị trí. Nhà cung cấp bản đồ đã cấu hình xử lý vùng hiển thị; Apple/Google Maps chỉ mở khi bạn chọn liên kết điều hướng.';
en.free='GPS is requested only when you choose current location. The configured map provider handles the visible area; Apple/Google Maps opens only through your navigation action.';
