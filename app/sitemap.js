import {publicNews} from '@/lib/content/news';
import {NEWS_TOPICS,topicForArticle} from '@/lib/content/news-topics';
export const dynamic='force-dynamic';
export default async function sitemap(){const rows=await publicNews(),pages=['','/explore','/lend','/news','/pricing','/cms/privacy'];return [...pages.map(path=>({url:`https://reloo.vn${path}`,changeFrequency:'weekly',priority:path===''?1:0.6})),...NEWS_TOPICS.filter(t=>rows.some(r=>topicForArticle(r).slug===t.slug)).map(t=>({url:`https://reloo.vn/news/chu-de/${t.slug}`,changeFrequency:'daily',priority:0.7})),...rows.map(row=>({url:`https://reloo.vn/news/${row.slug}`,lastModified:new Date(row.updated_at),changeFrequency:'monthly',priority:0.7}))];}
