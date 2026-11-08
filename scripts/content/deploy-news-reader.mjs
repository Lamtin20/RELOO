import {spawnSync} from 'node:child_process';
import {connect} from '../laptop-ssh.mjs';
const files=['components/content/NewsReader.jsx','components/content/NewsReader.css','components/listings/ArticleBody.jsx','components/owner/NewsManager.jsx','lib/content/article-outline.js','app/news/page.js','app/news/[id]/page.js','app/crm/news-preview'];
const archive='output/deployment/news-reader.tar.gz';
if(spawnSync('tar',['-czf',archive,...files]).status!==0)throw Error('PACK_FAILED');
const stamp=process.argv[2]||'news-reader-20261014';
const directory='/srv/reloo/backups/'+stamp,c=await connect(process.env.RELOO_BUILD_PUBLISH_PASSWORD);
try{
 const backup=await c.exec(`mkdir -p ${directory} && chmod 700 ${directory} && tar -czf ${directory}/source-before.tar.gz -C /srv/reloo/apps/web app/news app/crm components/content components/listings/ArticleBody.jsx components/owner/NewsManager.jsx lib/content`,60000);
 if(backup.code!==0)throw Error('BACKUP_FAILED');
 await new Promise((resolve,reject)=>c.sftp.fastPut(archive,directory+'/update.tar.gz',error=>error?reject(error):resolve()));
 await c.write(directory+'/patch-header.py',`from pathlib import Path
p = Path('/srv/reloo/apps/web/components/mobile/AppHeader.jsx')
s = p.read_text()
if 'const TitleTag=' not in s:
    s = s.replace('export function AppHeader() {', """export function AppHeader() {
  const TitleTag=usePathname()?.startsWith('/news')?'span':'h1';""")
s = s.replace('<h1>', "<TitleTag className={TitleTag==='span'?'news-header-label':undefined}>").replace('</h1>', '</TitleTag>')
p.write_text(s)
`);
 await c.write(directory+'/deploy.sh',`#!/bin/sh
set -eu
cd /srv/reloo/apps/web
docker tag reloo-web-app ${stamp}-app-before
tar -xzf ${directory}/update.tar.gz
python3 ${directory}/patch-header.py
docker compose -p reloo-web --env-file .env.production --env-file .env.tunnel -f compose.yml -f deploy/compose.homelab.yml build app
docker compose -p reloo-web --env-file .env.production --env-file .env.tunnel -f compose.yml -f deploy/compose.homelab.yml up -d --no-deps --wait --wait-timeout 120 app
curl --fail http://127.0.0.1:3000/api/health
echo DEPLOYMENT_OK
`);
 const start=await c.exec(`nohup sh ${directory}/deploy.sh > ${directory}/deploy.log 2>&1 < /dev/null & echo STARTED`);
 if(start.code!==0)throw Error('DEPLOY_START_FAILED');console.log('News reader deployment started with backup; articles remain drafts.');
}finally{c.close();}
