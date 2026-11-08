import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createStayFixture} from '../lib/stays/test-database.mjs';
const dir=resolve('output/stays-preview/run-'+Date.now()+'/database');await mkdir(dir,{recursive:true});
const fixture=await createStayFixture(dir);await fixture.close();
const port=process.env.RELOO_STAYS_TEST_PORT||'4522';
const env={...process.env,NODE_ENV:'development',RELOO_STAYS_TEST_MODE:'1',RELOO_STAYS_TEST_DB:dir,APP_ORIGIN:'http://127.0.0.1:'+port,CRM_ORIGIN:'http://127.0.0.1:'+port,
NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:45999',SUPABASE_INTERNAL_URL:'http://127.0.0.1:45999',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_SECRET_KEY:'',SUPABASE_URL:'http://127.0.0.1:45999',SUPABASE_PUBLISHABLE_KEY:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:process.env.RELOO_BROWSER_FIXTURE==='1'?'public-synthetic-fixture-not-a-credential':'',RELOO_EDGE_SECRET:'',TRUST_PROXY:'false'};
console.log('Isolated synthetic booking preview: '+env.APP_ORIGIN+'/dat-phong');
console.log('No production inventory, payment, email or notifications. Stop with Ctrl+C.');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',port],{env,stdio:'inherit',windowsHide:true});
child.once('exit',code=>{process.exitCode=code||0});
