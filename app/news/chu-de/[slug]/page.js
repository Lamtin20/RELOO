import {notFound} from 'next/navigation';
import {publicNews} from '@/lib/content/news';
import {topicBySlug,topicForArticle} from '@/lib/content/news-topics';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {NewsHub} from '@/components/content/NewsHub';
import {NewsHubSchema} from '@/components/content/NewsHubSchema';
export const dynamic='force-dynamic';
export async function generateMetadata({params,searchParams}){
 const topic=topicBySlug((await params).slug);if(!topic)return {title:'Không tìm thấy chuyên mục',robots:{index:false}};
 const p=await searchParams,rows=await publicNews();
 return {title:topic.name+' | Tin tức & cẩm nang RELOO',description:topic.description,alternates:{canonical:'https://reloo.vn/news/chu-de/'+topic.slug},robots:{index:!p.q&&!p.page&&rows.some(r=>topicForArticle(r).slug===topic.slug),follow:true},openGraph:{title:topic.name+' | RELOO',description:topic.description,url:'https://reloo.vn/news/chu-de/'+topic.slug,type:'website',locale:'vi_VN'}};
}
export default async function TopicPage({params,searchParams}){
 const topic=topicBySlug((await params).slug);if(!topic)notFound();
 const p=await searchParams,articles=await publicNews(),q=typeof p.q==='string'?p.q.slice(0,120):'',page=Number(p.page)||1;return <MarketplaceShell><NewsHub articles={articles} topic={topic} q={q} page={page}/><NewsHubSchema articles={articles} topic={topic} q={q} page={page}/></MarketplaceShell>;
}
