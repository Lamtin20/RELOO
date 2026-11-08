import {readFile,writeFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {connect} from '../laptop-ssh.mjs';
const receipt='output/news/crm-receipt.json';
try{await access(receipt);console.log('CRM receipt already exists; no duplicate draft insertion attempted.');process.exit(0);}catch{}
const pack=JSON.parse(await readFile('output/news/articles.json','utf8'));
const rows=[],media=[];
for(const item of pack){
 const {cover_file,source_file,words,...record}=item;
 const id=randomUUID(),coverId=randomUUID();
 const bytes=await readFile('output/news/'+cover_file),metadata=await sharp(bytes).metadata();
 if(metadata.format!=='webp'||metadata.width!==1200||metadata.height!==630)throw Error('INVALID_NEWS_COVER');
 rows.push({...record,id,cover_id:coverId});
 media.push({id:coverId,filename:coverId+'.webp',mime:'image/webp',width:metadata.width,height:metadata.height,bytes:bytes.length,purpose:'news',source:cover_file});
}
const tag='news_'+randomUUID().replaceAll('-',''),quote=value=>`$${tag}$${JSON.stringify(value)}$${tag}$::jsonb`;
const sql=`BEGIN;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM news_articles WHERE slug IN (SELECT x->>'slug' FROM jsonb_array_elements(${quote(rows)}) x)) THEN RAISE EXCEPTION 'ARTICLE_SLUG_EXISTS'; END IF; END $$;
INSERT INTO media_assets(id,filename,mime,width,height,bytes,purpose)
SELECT id,filename,mime,width,height,bytes,purpose FROM jsonb_to_recordset(${quote(media)}) AS x(id uuid,filename text,mime text,width integer,height integer,bytes integer,purpose text);
INSERT INTO news_articles(id,title,slug,excerpt,body,cover_id,cover_alt,seo_title,seo_description,author_name,category,tags,status,publish_at)
SELECT id,title,slug,excerpt,body,cover_id,cover_alt,seo_title,seo_description,author_name,category,tags,'DRAFT',NULL FROM jsonb_to_recordset(${quote(rows)}) AS x(id uuid,title text,slug text,excerpt text,body text,cover_id uuid,cover_alt text,seo_title text,seo_description text,author_name text,category text,tags text[]);
INSERT INTO security_audit(action,details) SELECT 'NEWS_DRAFT',jsonb_build_object('id',id,'slug',slug,'source','authorized_workspace_content_task','publication','not_requested') FROM news_articles WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(${quote(rows)}) x);
COMMIT;
SELECT json_agg(x) FROM (SELECT id,title,slug,status,cover_id FROM news_articles WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(${quote(rows)}) x)) x;
`;
await writeFile('output/news/import-drafts.sql',sql);
const c=await connect(process.env.RELOO_BUILD_PUBLISH_PASSWORD);
const directory='/srv/reloo/backups/news-drafts-'+randomUUID();
const targets=[];
let committed=false;
let databaseAttempted=false;
try{
 const initialized=await c.exec(`mkdir -m 700 ${directory} && docker exec reloo-vn-db-1 pg_dump -U postgres -d postgres --data-only --table=news_articles --table=media_assets > ${directory}/before.sql`);
 if(initialized.code!==0)throw Error('NEWS_BACKUP_FAILED');
 await c.write(directory+'/import.sql',sql);
 for(const item of media){
  const target='/srv/reloo/data/public-media/'+item.filename;
  await new Promise((resolve,reject)=>c.sftp.fastPut('output/news/'+item.source,target,error=>error?reject(error):resolve()));
  targets.push(target);
  const permissions=await c.exec(`chown 1000:1000 ${target} && chmod 640 ${target}`);
  if(permissions.code!==0)throw Error('COVER_PERMISSIONS_FAILED');
 }
 databaseAttempted=true;
 const imported=await c.exec(`docker exec -i reloo-vn-db-1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ${directory}/import.sql`);
 if(imported.code!==0)throw Error('CRM_DRAFT_IMPORT_FAILED: '+imported.output.slice(-500));
 committed=true;
 const confirmation={createdAt:new Date().toISOString(),status:'DRAFT',published:false,backup:directory,articles:rows.map(({id,title,slug,cover_id})=>({id,title,slug,cover_id,status:'DRAFT',coverUrl:'/api/media/'+cover_id}))};
 await writeFile(receipt,JSON.stringify(confirmation,null,2));
 console.log(imported.output);
}finally{
 if(!committed&&!databaseAttempted)for(const target of targets)await new Promise(resolve=>c.sftp.unlink(target,()=>resolve()));
 c.close();
}
