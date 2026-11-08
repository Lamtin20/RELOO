export const RELOO_PALETTE=Object.freeze({
 brand:{value:'#087F5B',label:'Xanh RELOO',usage:'CTA chính, liên kết và trạng thái đang chọn'},
 brandHover:{value:'#056445',label:'Xanh tương tác',usage:'Hover và nhấn CTA'},
 ink:{value:'#173B2D',label:'Mực nội dung',usage:'Tiêu đề và nội dung chính'},
 muted:{value:'#536D60',label:'Chữ phụ',usage:'Mô tả, ghi chú và nhãn phụ'},
 canvas:{value:'#EDF3EF',label:'Nền trang',usage:'Lớp nền phía sau card'},
 surface:{value:'#FFFFFF',label:'Bề mặt card',usage:'Card sản phẩm, form và hộp thoại'},
 border:{value:'#CCDCD1',label:'Đường phân cách',usage:'Viền card, trường nhập và divider'},
 mint:{value:'#DDF4E5',label:'Mint',usage:'Thu nhập, lợi ích thuê và trạng thái thành công'},
 blue:{value:'#225FAD',label:'Xanh tin cậy',usage:'Bảo mật và thông tin'},
 blueSurface:{value:'#E2EDFF',label:'Nền tin cậy',usage:'Card an tâm'},
 amber:{value:'#8D5216',label:'Nâu ưu đãi',usage:'Chữ trên card hoàn tiền'},
 amberSurface:{value:'#FFE3AA',label:'Nền ưu đãi',usage:'Card hoàn tiền và chương trình'},
 violet:{value:'#513294',label:'Tím Shorts',usage:'Video và nội dung cộng đồng'},
 danger:{value:'#B42336',label:'Lỗi',usage:'Thông báo lỗi và thao tác nguy hiểm'},
});
export function relativeLuminance(hex){const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function contrastRatio(a,b){const x=relativeLuminance(a),y=relativeLuminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
