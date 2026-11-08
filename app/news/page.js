import {publicNews} from '@/lib/content/news';
import {MarketplaceShell} from '@/components/layout/MarketplaceShell';
import {NewsHub} from '@/components/content/NewsHub';
import {NewsHubSchema} from '@/components/content/NewsHubSchema';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}){
 const p=await searchParams;return {title:'Tin tức & cẩm nang: thuê đồ, chi tiêu và sống xanh | RELOO',description:'Khám phá kinh nghiệm thuê–mua, sản phẩm thiết bị, quản lý chi tiêu, tin tài chính và tiêu dùng bền vững cùng RELOO.',alternates:{canonical:'https://reloo.vn/news'},robots:p.q||p.page?{index:false,follow:true}:undefined};
}
export default async function NewsIndex({searchParams}){
 const p=await searchParams,q=typeof p.q==='string'?p.q.slice(0,120):'';
 const articles=await publicNews(),page=Number(p.page)||1;
 return <MarketplaceShell><NewsHub articles={articles} q={q} page={page}/><NewsHubSchema articles={articles} q={q} page={page}/></MarketplaceShell>;
}
