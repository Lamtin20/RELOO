export const CRM_NAV_GROUPS=[
 {id:'operations',label:'Vận hành',description:'Tổng quan, công việc và phối hợp',views:['overview','control','neighborhood','tasks','opportunities']},
 {id:'customers',label:'Khách hàng',description:'Chăm sóc và xử lý yêu cầu',views:['customers','conversations','support','callcenter']},
 {id:'communications',label:'Truyền thông',description:'Bài viết, hình ảnh và chương trình',views:['news','content','banners','promotions','affiliate','branding']},
 {id:'finance',label:'Tài chính',description:'Thu chi, đối soát và hồ sơ thuế',views:['finance','virtualAccounts','accounting','tax']},
 {id:'safety',label:'An toàn',description:'Định danh, rủi ro và hồ sơ pháp lý',views:['kyc','cases','blacklist','integrity','legal']},
 {id:'system',label:'Hệ thống',description:'Nhân sự, phân quyền và tích hợp',views:['staff','personnel','settings','bots','jobs','analytics','traffic']},
];
export const normalizeTool=value=>String(value||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/g,'d');
export function crmNavigation(views,allowed,query=''){
 const q=normalizeTool(query).trim();const covered=new Set(CRM_NAV_GROUPS.flatMap(g=>g.views));
 return [...CRM_NAV_GROUPS,{id:'other',label:'Công cụ khác',description:'Phân hệ bổ sung',views:Object.keys(views).filter(v=>!covered.has(v))}].map(g=>({...g,items:g.views.filter(v=>v!=='shorts'&&allowed.includes(v)&&views[v]).map(v=>({id:v,label:views[v][0],Icon:views[v][1]})).filter(v=>!q||normalizeTool(v.label+' '+g.label+' '+g.description).includes(q))})).filter(g=>g.items.length);
}
