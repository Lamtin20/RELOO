export function auditProductSeo(asset){
 const issues=[];const add=(code,priority,evidence,fix)=>issues.push({code,priority,evidence,fix,url:'/product/'+encodeURIComponent(asset.id)});
 if(!asset.title||asset.title.trim().length<12)add('TITLE_SHORT','medium',asset.title||'','Review a descriptive title using verified product facts.');
 if((asset.description||'').trim().length<120)add('CONTENT_REVIEW','medium','description characters: '+(asset.description||'').length,'Add factual condition, included accessories and rental terms.');
 if(!asset.images?.length)add('IMAGE_MISSING','high','No product image','Upload an accurate product photo; WebP pipeline is required.');
 const indexable=['available','rented'].includes(asset.status)&&!asset.listing_data?.neighborhoodOnly;
 if(!indexable)add('NOT_PUBLIC_INDEXABLE','info',asset.status,'Review visibility/moderation; do not publish restricted assets for SEO.');
 return {version:1,indexable,canonical:'https://reloo.vn/product/'+encodeURIComponent(asset.id),score:Math.max(0,100-issues.filter(i=>i.priority!=='info').length*20),scoreKind:'internal-completeness',issues,googleIndexed:null,httpStatus:null,robotsVerified:false,structuredDataVerified:false,performanceMeasured:false};
}
export function campaignLink(assetId,input){
 if(!/^[a-zA-Z0-9_-]{1,150}$/.test(assetId))throw Error('INVALID_ASSET');const q=new URLSearchParams();for(const key of ['source','medium','campaign','content']){const v=String(input[key]||'').trim().toLowerCase();if(v&&(!/^[a-z0-9_-]{1,60}$/.test(v)||/\d{6,}|@/.test(v)||v.replace(/\D/g,'').length>=7))throw Error('UTM_NO_PERSONAL_DATA');if(v)q.set('utm_'+key,v);}return 'https://reloo.vn/product/'+encodeURIComponent(assetId)+(q.size?'?'+q:'');
}
