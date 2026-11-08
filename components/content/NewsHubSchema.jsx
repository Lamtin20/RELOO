import{headers}from'next/headers';
import{filterNews}from'@/lib/content/news-topics';
export async function NewsHubSchema({articles,topic,q='',page=1}){
 const url='https://reloo.vn/news'+(topic?'/chu-de/'+topic.slug:''),rows=filterNews(articles,{topic,q,page}).rows;
 const data=[{'@context':'https://schema.org','@type':'CollectionPage',name:topic?.name||'Tin tức & cẩm nang RELOO',url,inLanguage:'vi-VN',mainEntity:{'@type':'ItemList',itemListElement:rows.map((row,i)=>({'@type':'ListItem',position:i+1,url:'https://reloo.vn/news/'+row.slug,name:row.title}))}},{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Trang chủ',item:'https://reloo.vn'},{'@type':'ListItem',position:2,name:'Tin tức & cẩm nang',item:'https://reloo.vn/news'},...(topic?[{'@type':'ListItem',position:3,name:topic.name,item:url}]:[])]}];
 return <script nonce={(await headers()).get('x-nonce')||undefined} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>;
}
