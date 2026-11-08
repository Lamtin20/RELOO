import {headers} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {requirePermission} from '@/lib/operations/permissions';
import {NewsReader} from '@/components/content/NewsReader';
import {mediaUrl} from '@/lib/content/media';
export const dynamic='force-dynamic';
export const metadata={title:'Xem trước bài viết | RELOO CRM',robots:{index:false,follow:false}};
export default async function DraftPreview({params}){
 const {id}=await params;
 let account;
 try{account=await requirePermission(new Request('https://crm.reloo.vn/api/crm/news-preview',{headers:await headers()}),'content.read');}
 catch(error){if(error.status===401)redirect('/crm/login');notFound();}
 const {data,error}=await account.db.from('news_articles').select('*').eq('id',id).single();
 if(error||!data)notFound();
 return <NewsReader row={{...data,coverUrl:mediaUrl(data.cover_id)}} preview/>;
}
