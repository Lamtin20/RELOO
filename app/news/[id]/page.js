import {notFound,permanentRedirect} from 'next/navigation';
import {newsBySlug,publicNews} from '@/lib/content/news';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {NewsReader} from '@/components/content/NewsReader';
import {headers} from 'next/headers';
export const dynamic='force-dynamic';
export async function generateMetadata({params}){
 const row=await newsBySlug((await params).id);
 if(!row)return {title:'Bài viết chưa công khai',robots:{index:false,follow:false}};
 const url=`https://reloo.vn/news/${row.slug}`;
 return {title:row.seo_title||`${row.title} | RELOO`,description:row.seo_description||row.excerpt,alternates:{canonical:url},openGraph:{type:'article',title:row.seo_title||row.title,description:row.seo_description||row.excerpt,url,locale:'vi_VN',publishedTime:row.publish_at||row.created_at,modifiedTime:row.updated_at,images:row.coverUrl?[{url:row.coverUrl,alt:row.cover_alt,width:1200,height:630}]:[]},twitter:{card:'summary_large_image',title:row.title,description:row.excerpt,images:row.coverUrl?[row.coverUrl]:[]}};
}
export default async function NewsPage({params}){
 const {id}=await params,row=await newsBySlug(id);
 if(!row)notFound();
 if(id===row.id)permanentRedirect(`/news/${row.slug}`);
 const other=(await publicNews()).filter(article=>article.id!==row.id);
 const related=[...other.filter(a=>a.category===row.category),...other.filter(a=>a.category!==row.category)].slice(0,3);
 const url=`https://reloo.vn/news/${row.slug}`;
 const structured=[{
  '@context':'https://schema.org','@type':'Article',headline:row.title,description:row.excerpt,inLanguage:'vi-VN',datePublished:row.publish_at||row.created_at,dateModified:row.updated_at,author:{'@type':'Organization',name:row.author_name||'RELOO'},publisher:{'@type':'Organization',name:'RELOO'},mainEntityOfPage:url,image:row.coverUrl?`https://reloo.vn${row.coverUrl}`:undefined,
 },{
  '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Trang chủ',item:'https://reloo.vn'},{'@type':'ListItem',position:2,name:'Tin tức & cẩm nang',item:'https://reloo.vn/news'},{'@type':'ListItem',position:3,name:row.title,item:url}],
 }];
 const nonce=(await headers()).get('x-nonce')||undefined;
 return <MarketplaceShell><NewsReader row={row} related={related}/><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,String.fromCharCode(92)+'u003c')}}/></MarketplaceShell>;
}
