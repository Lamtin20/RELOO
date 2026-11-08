import {Client} from 'ssh2';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const pinned=createHash('sha256').update(Buffer.from('AAAAC3NzaC1lZDI1NTE5AAAAIA0DIIclMQO1BoTJF20LB2alsX9GNVrrJmpagcf/YJQa','base64')).digest('hex'),c=new Client(),privateKey=await readFile('output/uat/reloo-uat-access');
const db='reloo_map_qa_'+Date.now();
async function run(command,input=''){return new Promise((resolve,reject)=>c.exec(command,(e,s)=>{if(e)return reject(e);let output='';s.on('data',b=>output+=b);s.stderr.on('data',b=>output+=b);s.on('close',code=>resolve({code,output}));s.end(input)}))}
let created=false;
try{
 await new Promise((resolve,reject)=>c.once('ready',resolve).once('error',reject).connect({host:'100.107.146.119',username:'root',privateKey,hostHash:'sha256',hostVerifier:h=>h===pinned,readyTimeout:7000}));
 const create=await run('docker exec reloo-vn-db-1 createdb -U postgres '+db);if(create.code)throw Error(create.output);created=true;
 const migration=await readFile('supabase/migrations/20261107140000_live_map.sql','utf8');
 const schema=`CREATE TABLE public.assets(id text primary key,title text,category text,daily_price bigint,images jsonb,location_details jsonb,status text,is_locked boolean default false,dispute_status text,listing_data jsonb);INSERT INTO assets VALUES('qa-before','Existing asset','may-anh',100000,'[]','{"coords":{"lat":10.77,"lng":106.7}}','available',false,null,'{}');`;
 const tests=`
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM reloo_map_features WHERE entity_id='qa-before') THEN RAISE EXCEPTION 'EXISTING_ASSET_PROJECTION_FAILED';END IF;END $$;
DELETE FROM assets WHERE id='qa-before';
GRANT SELECT,INSERT,UPDATE,DELETE ON public.assets TO service_role;
SET ROLE service_role;
INSERT INTO assets VALUES('qa-camera','Sony camera','may-anh',150000,'[]','{"coords":{"lat":10.77123456,"lng":106.69123456},"ward":{"name":"QA Ward"},"province":{"name":"QA Province"},"addressDetail":"PRIVATE ADDRESS"}','available',false,null,'{"transactionMode":"RENT"}');
RESET ROLE;
DO $$ DECLARE result jsonb; BEGIN
 result:=reloo_map_search('{"bbox":[106.6,10.7,106.8,10.9],"domain":"marketplace","mode":"RENT","category":"","q":"","limit":100,"offset":0,"min":0,"max":1000000000}');
 IF jsonb_array_length(result->'rows')<>1 THEN RAISE EXCEPTION 'SEARCH_FAILED';END IF;
 IF result::text LIKE '%PRIVATE ADDRESS%' OR result::text LIKE '%10.77123456%' THEN RAISE EXCEPTION 'PRIVACY_FAILED';END IF;
 IF (result->'rows'->0->>'accuracy_meters')::int<1000 THEN RAISE EXCEPTION 'ACCURACY_FAILED';END IF;
 IF jsonb_typeof(result->'rows'->0->'version')<>'string' THEN RAISE EXCEPTION 'VERSION_PRECISION_FAILED';END IF;
 IF has_table_privilege('anon','reloo_map_features','SELECT') OR has_function_privilege('authenticated','reloo_map_search(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'PRIVILEGE_FAILED';END IF;
END $$;
UPDATE assets SET daily_price=200000 WHERE id='qa-camera';
SELECT 'versions',count(*) FROM reloo_map_events;
UPDATE assets SET is_locked=true WHERE id='qa-camera';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM reloo_map_features WHERE visible) THEN RAISE EXCEPTION 'LOCK_VISIBILITY_FAILED';END IF;END $$;
UPDATE assets SET is_locked=false,listing_data='{"neighborhoodOnly":true}' WHERE id='qa-camera';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM reloo_map_features WHERE visible) THEN RAISE EXCEPTION 'NEIGHBORHOOD_PRIVACY_FAILED';END IF;END $$;
UPDATE assets SET listing_data='{"transactionMode":"SALE","salePrice":1000000}' WHERE id='qa-camera';
SELECT 'sale',price,price_unit FROM reloo_map_features;
DELETE FROM assets WHERE id='qa-camera';
DO $$ BEGIN IF EXISTS(SELECT 1 FROM reloo_map_features) THEN RAISE EXCEPTION 'DELETE_FAILED';END IF;END $$;
SELECT 'POSTGIS_QA_PASS';
INSERT INTO reloo_map_features(id,entity_id,domain,title,category,price,price_unit,point,visible)
 SELECT 'qa:'||n,n::text,'marketplace','DEMO synthetic item '||n,'may-anh',100000,'DAY',extensions.ST_SetSRID(extensions.ST_MakePoint(106.65+(n%100)*0.001,10.72+(n/100)*0.001),4326),true FROM generate_series(1,1000) n;
ANALYZE reloo_map_features;
CREATE TEMP TABLE qa_map_timings(ms double precision);
DO $$ DECLARE n integer;started timestamptz; BEGIN FOR n IN 1..100 LOOP
 started:=clock_timestamp();PERFORM reloo_map_search('{"bbox":[106.6,10.7,106.8,10.9],"domain":"marketplace","mode":"RENT","category":"","q":"","limit":100,"offset":0,"min":0,"max":1000000000}');INSERT INTO qa_map_timings VALUES(extract(epoch FROM clock_timestamp()-started)*1000);
END LOOP;END $$;
SELECT 'SQL_ONLY_1000_SYNTHETIC_ROWS_100_SEQUENTIAL_QUERIES' scope,count(*) samples,round(percentile_cont(.95) WITHIN GROUP(ORDER BY ms)::numeric,3) p95_ms,round(avg(ms)::numeric,3) mean_ms FROM qa_map_timings;
`;
 const result=await run('docker exec -i reloo-vn-db-1 psql -U postgres -d '+db+' -v ON_ERROR_STOP=1',schema+'\n'+migration+'\n'+tests);
 console.log(JSON.stringify(result));await writeFile('output/verification/live-map-postgis.json',JSON.stringify({scope:'Synthetic assets in isolated temporary database; no production asset mutation',...result},null,2));
 if(result.code!==0)process.exitCode=1;
 if(result.code===0){const rollback=await run('docker exec -i reloo-vn-db-1 psql -U postgres -d '+db+' -v ON_ERROR_STOP=1',await readFile('deploy/vietnam/live-map-rollback.sql','utf8'));console.log(JSON.stringify({rollback}));if(rollback.code!==0)process.exitCode=1;}
}finally{if(created)console.log(JSON.stringify({cleanup:await run('docker exec reloo-vn-db-1 dropdb -U postgres '+db)}));c.end()}

