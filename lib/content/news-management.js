export const NEWS_STATUS_LABELS={DRAFT:'Bản nháp',SCHEDULED:'Hẹn đăng',PUBLISHED:'Đã đăng',ARCHIVED:'Lưu trữ'};
export const canPublishNow=row=>['DRAFT','SCHEDULED'].includes(row?.status);
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
export function filterManagedNews(rows,{status='ALL',category='',query='',sort='newest'}={}){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return rows.filter(row=>(status==='ALL'||(status==='UNPUBLISHED'?canPublishNow(row):row.status===status))&&(!category||row.category===category)&&words.every(word=>normalize([row.title,row.slug,row.category].join(' ')).includes(word))).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'vi'):((Date.parse(b.updated_at||b.created_at)||0)-(Date.parse(a.updated_at||a.created_at)||0))*(sort==='oldest'?-1:1));
}
