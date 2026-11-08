// Static source metadata only: no env, user records, input values or authentication data.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const digest=b=>createHash('sha256').update(b).digest('hex');
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',maxBuffer:16000000}).split('\0').filter(Boolean);
const fields=[],assets=[];
for(const path of [...new Set(paths)].sort()){
 const stat=await lstat(path).catch(()=>null);if(!stat?.isFile()||stat.isSymbolicLink())continue;
 if(/^(app|components)\/.*\.[jt]sx?$/.test(path)&&stat.size<2000000){
  const text=await readFile(path,'utf8'),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit=node=>{
   if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
    const tag=node.tagName.getText(source);if(['input','textarea','select'].includes(tag)){
     const props={};for(const a of node.attributes.properties){if(!ts.isJsxAttribute(a))continue;const name=a.name.getText(source);if(!['name','id','type','aria-label'].includes(name))continue;const init=a.initializer;props[name]=init&&ts.isStringLiteral(init)?init.text:init?'DYNAMIC':'BOOLEAN';}
     const field=props.name||props.id||props['aria-label']||'DYNAMIC_OR_UNNAMED',line=source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
     fields.push({id:digest(path+':'+line+':'+field).slice(0,16),path,line,tag,field,type:props.type||null,sourceSha256:digest(text),purpose:'NEEDS_OWNER_REVIEW',necessity:'NOT_VERIFIED',noticeVersion:null,retention:null,recipients:[],owner:'Domain owner + Privacy',status:'NEEDS_REVIEW'});
    }
   }ts.forEachChild(node,visit);
  };visit(source);
 }
 if(/^public\//.test(path)&&/\.(?:webp|png|jpe?g|gif|svg|avif|woff2?|ttf|mp4|mp3|ogg|wav)$/i.test(path)&&stat.size<50000000){
  assets.push({path,sha256:digest(await readFile(path)),bytes:stat.size,origin:null,rightsHolder:null,license:null,permittedUses:[],approval:null,expiry:null,derivativeChain:[],status:'NEEDS_PROVENANCE_REVIEW'});
 }
}
// Preserve human-reviewed records only while exact source/asset identity still matches.
const oldFields=JSON.parse(await readFile('compliance/field-purposes.json','utf8')).fields||[],oldAssets=JSON.parse(await readFile('compliance/asset-provenance.json','utf8')).assets||[];
const merge=(rows,old,key,identity)=>rows.map(row=>{const prior=old.find(x=>x[key]===row[key]&&x[identity]===row[identity]);return prior?{...row,...prior}:row});
await writeFile('compliance/field-purposes.json',JSON.stringify({version:2,status:'INCOMPLETE',method:'Static JSX literals, no values. Dynamic/custom component fields require manual review. Generated candidate coverage is not approved necessity.',fields:merge(fields,oldFields,'id','sourceSha256')},null,2)+'\n');
await writeFile('compliance/asset-provenance.json',JSON.stringify({version:2,status:'INCOMPLETE',method:'Public distribution asset hashes; rights cannot be inferred from names or public availability.',assets:merge(assets,oldAssets,'path','sha256')},null,2)+'\n');
console.log(JSON.stringify({fieldCandidates:fields.length,assetCandidates:assets.length,scope:'Bounded static metadata. No approval inferred.'}));
