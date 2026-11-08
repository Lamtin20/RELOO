import {readFile,writeFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {connect} from '../laptop-ssh.mjs';
const root='output/news/library',receipt=root+'/crm-receipt.json';
try{await access(receipt);console.log('Import receipt exists; no duplicate writes.');process.exit(0);}catch{}
const input=JSON.parse(await readFile(root+'/articles.json','utf8'));
const c=await connect(process.env.RELOO_BUILD_PUBLISH_PASSWORD);
const directory='/srv/reloo/backups/seo-library-'+randomUUID();
const uploaded=[];let attempted=false;
try{
 const current=await c.exec(`docker exec reloo-vn-db-1 psql -U postgres -d postgres -Atc "select coalesce(json_agg(t),'[]'::json) from (select id,slug,status,version,cover_id from news_articles) t"`);
 if(current.code!==0)throw Error('NEWS_INSPECTION_FAILED');
 const existing=JSON.parse(current.output.trim()),rows=[],media=[];
 for(const article of input){
  const {cover_file,inline_file,source_file,words,enhanced,...record}=article;
  const found=existing.find(a=>a.slug===article.slug);
  if(enhanced&&(!found||found.id!==article.id||found.status!=='DRAFT'))throw Error('EXISTING_ARTICLE_CHANGED '+article.slug);
  if(!enhanced&&found)throw Error('NEW_SLUG_EXISTS '+article.slug);
  const inlineId=randomUUID();
  const inlineBytes=await readFile(root+'/'+inline_file),inlineMetadata=await sharp(inlineBytes).metadata();
  if(inlineMetadata.format!=='webp')throw Error('INLINE_NOT_WEBP');
  media.push({id:inlineId,filename:inlineId+'.webp',mime:'image/webp',width:inlineMetadata.width,height:inlineMetadata.height,bytes:inlineBytes.length,purpose:'news',source:inline_file});
  let coverId=found?.cover_id;
  if(!enhanced){
   coverId=randomUUID();const bytes=await readFile(root+'/'+cover_file),metadata=await sharp(bytes).metadata();
   if(metadata.format!=='webp'||metadata.width!==1200||metadata.height!==630)throw Error('COVER_INVALID');
   media.push({id:coverId,filename:coverId+'.webp',mime:'image/webp',width:metadata.width,height:metadata.height,bytes:bytes.length,purpose:'news',source:cover_file});
  }
  const body=record.body.replaceAll('./'+inline_file,'/api/media/'+inlineId);
  if(body.includes('./assets/'))throw Error('UNRESOLVED_IMAGE');
  rows.push({...record,id:found?.id||randomUUID(),cover_id:coverId,body,enhanced:!!enhanced,expectedVersion:found?.version||1});
 }
 const tag='lib_'+randomUUID().replaceAll('-',''),quote=value=>`$${tag}$${JSON.stringify(value)}$${tag}$::jsonb`;
 const additions=rows.filter(a=>!a.enhanced),updates=rows.filter(a=>a.enhanced);
 const type='id uuid,title text,slug text,excerpt text,body text,cover_id uuid,cover_alt text,seo_title text,seo_description text,author_name text,category text,tags text[],"expectedVersion" integer';
 const sql=`BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM news_articles WHERE slug IN (SELECT x->>'slug' FROM jsonb_array_elements(${quote(additions)}) x)) THEN RAISE EXCEPTION 'NEW_SLUG_EXISTS'; END IF;
 IF (SELECT count(*) FROM news_articles a JOIN jsonb_to_recordset(${quote(updates)}) AS x(id uuid,"expectedVersion" integer) ON a.id=x.id WHERE a.status='DRAFT' AND a.version=x."expectedVersion")<>3 THEN RAISE EXCEPTION 'DRAFT_VERSION_CHANGED'; END IF;
END $$;
INSERT INTO media_assets(id,filename,mime,width,height,bytes,purpose) SELECT id,filename,mime,width,height,bytes,purpose FROM jsonb_to_recordset(${quote(media)}) AS x(id uuid,filename text,mime text,width integer,height integer,bytes integer,purpose text);
INSERT INTO news_articles(id,title,slug,excerpt,body,cover_id,cover_alt,seo_title,seo_description,author_name,category,tags,status,publish_at) SELECT id,title,slug,excerpt,body,cover_id,cover_alt,seo_title,seo_description,author_name,category,tags,'DRAFT',NULL FROM jsonb_to_recordset(${quote(additions)}) AS x(${type});
UPDATE news_articles a SET body=x.body,excerpt=x.excerpt,seo_title=x.seo_title,seo_description=x.seo_description,tags=x.tags,version=a.version+1,updated_at=now() FROM jsonb_to_recordset(${quote(updates)}) AS x(${type}) WHERE a.id=x.id AND a.version=x."expectedVersion" AND a.status='DRAFT';
INSERT INTO security_audit(action,details) SELECT 'NEWS_DRAFT',jsonb_build_object('id',id,'slug',slug,'source','authorized_seo_content_task','publication','not_requested') FROM news_articles WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(${quote(rows)}) x);
COMMIT;
SELECT count(*) AS drafts_saved FROM news_articles WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(${quote(rows)}) x) AND status='DRAFT';
`;
 await writeFile(root+'/cms-articles.json',JSON.stringify(rows,null,2));await writeFile(root+'/import.sql',sql);
 const backup=await c.exec(`mkdir -m 700 ${directory} && docker exec reloo-vn-db-1 pg_dump -U postgres -d postgres --data-only --table=news_articles --table=media_assets > ${directory}/before.sql`);
 if(backup.code!==0)throw Error('BACKUP_FAILED');
 await c.write(directory+'/import.sql',sql);
 for(const file of media){
  const path='/srv/reloo/data/public-media/'+file.filename;
  await new Promise((resolve,reject)=>c.sftp.fastPut(root+'/'+file.source,path,error=>error?reject(error):resolve()));uploaded.push(path);
  if((await c.exec(`chown 1000:1000 ${path} && chmod 640 ${path}`)).code!==0)throw Error('MEDIA_PERMISSIONS_FAILED');
 }
 attempted=true;
 const result=await c.exec(`docker exec -i reloo-vn-db-1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ${directory}/import.sql`,30000);
 if(result.code!==0)throw Error('DRAFT_IMPORT_FAILED '+result.output.slice(-500));
 await writeFile(receipt,JSON.stringify({status:'DRAFT',published:false,backup:directory,created:15,enhanced:3,images:33,articles:rows.map(({id,title,slug,cover_id,enhanced})=>({id,title,slug,cover_id,enhanced,preview:'https://crm.reloo.vn/crm/news-preview/'+id}))},null,2));
 console.log(result.output);
}finally{if(!attempted)for(const path of uploaded)await new Promise(resolve=>c.sftp.unlink(path,()=>resolve()));c.close();}
