import sharp from 'sharp';
import {readFile, writeFile, mkdir, copyFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const downloads = 'C:/Users/ASUS Zenbook/Downloads';
const filename = (await readdir(downloads)).find(name => name.includes('RELOOP') && name.endsWith('.png'));
if (!filename) throw Error('Approved reference file missing');
const source = await readFile(`${downloads}/${filename}`);
const directory = 'public/mascot/reloop/approved-v3';
await mkdir(directory, {recursive:true});
await copyFile(`${downloads}/${filename}`, `${directory}/reference.png`);

async function cut(name, box, outline, extraSeeds = []) {
  let input = sharp(source).extract(box).ensureAlpha();
  if (outline) {
    const polygon = outline.map(([x,y]) => `${x-box.left},${y-box.top}`).join(' ');
    input = input.composite([{input:Buffer.from(`<svg width="${box.width}" height="${box.height}"><polygon points="${polygon}" fill="white"/></svg>`),blend:'dest-in'}]);
  }
  const {data,info} = await input.raw().toBuffer({resolveWithObject:true});
  const visited = new Uint8Array(info.width*info.height), queue=[];
  const push=(x,y)=>{
    if(x<0||y<0||x>=info.width||y>=info.height)return;
    const p=y*info.width+x,i=p*4;
    if(visited[p])return;
    const background=data[i+3]===0||(data[i]>135&&data[i+1]>165&&data[i+2]>150);
    if(!background)return;
    visited[p]=1;queue.push(p);
  };
  for(let x=0;x<info.width;x++){push(x,0);push(x,info.height-1);}
  for(let y=0;y<info.height;y++){push(0,y);push(info.width-1,y);}
  for(const [x,y] of extraSeeds)push(x-box.left,y-box.top);
  for(let head=0;head<queue.length;head++){
    const p=queue[head],x=p%info.width,y=Math.floor(p/info.width);
    data[p*4+3]=0;push(x-1,y);push(x+1,y);push(x,y-1);push(x,y+1);
  }
  // Remove disconnected text fragments and background specks outside the character.
  const components=[], checked=new Uint8Array(info.width*info.height);
  for(let start=0;start<checked.length;start++){
    if(checked[start]||data[start*4+3]===0)continue;
    const component=[start];checked[start]=1;
    for(let head=0;head<component.length;head++){
      const p=component[head],x=p%info.width,y=Math.floor(p/info.width);
      for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
        if(nx<0||ny<0||nx>=info.width||ny>=info.height)continue;
        const next=ny*info.width+nx;
        if(!checked[next]&&data[next*4+3]){checked[next]=1;component.push(next);}
      }
    }
    components.push(component);
  }
  const largest=Math.max(...components.map(c=>c.length));
  for(const component of components)if(component.length<largest*0.03)for(const p of component)data[p*4+3]=0;
  await sharp(data,{raw:{width:info.width,height:info.height,channels:4}})
    .trim({threshold:8}).resize(640,640,{fit:'contain',background:'#00000000'})
    .webp({quality:95}).toFile(`${directory}/${name}.webp`);
}
const outline=[[228,71],[285,71],[289,108],[280,138],[326,130],[358,140],[383,163],[399,195],[392,228],[370,259],[346,289],[343,330],[359,370],[388,411],[431,442],[431,463],[397,479],[341,491],[288,478],[294,506],[289,533],[247,540],[226,533],[198,530],[150,540],[117,534],[110,513],[127,491],[128,452],[113,410],[109,368],[85,351],[69,333],[47,313],[46,289],[60,273],[76,266],[69,244],[70,226],[69,204],[74,180],[89,152],[112,138],[145,136],[178,150],[195,134],[203,107]];
await cut('master',{left:35,top:65,width:400,height:485},outline,[[110,188],[350,187],[230,500]]);
const names=[['idle','happy','excited','thinking','surprised','confident','wink','sad'],['frustrated','proud','love','grateful','concerned','sleeping','analyzing','celebrate']];
for(const [row,list] of names.entries())for(const [column,name] of list.entries()){
  await cut(name,{left:458+column*88,top:row===0?318:440,width:86,height:98});
}
const actions=[['wave','run','float','think','analyze','verify','trust','plant','protect','upload'],['recycle','share','love','heart','thinking','work','success','guide','sleep','greet']];
const actionColumns=[27,147,267,387,507,627,737,847,957,1067];
for(const [row,list] of actions.entries())for(const [column,name] of list.entries()){
  await cut(`action-${name}`,{left:actionColumns[column],top:row===0?598:713,width:110,height:80});
}
await writeFile(`${directory}/provenance.json`,JSON.stringify({source:filename,sha256:createHash('sha256').update(source).digest('hex'),method:'Cropped approved reference artwork; background masking only, no generated replacement.',limitations:'Master cropped from a 400×485 region. Expression/action crops are 86×98 / 105×80; no independent facial or limb rig. CSS movement animates the whole artwork, not individual hands or eyelids.'},null,2));
console.log('Prepared approved master, 16 expressions and 20 poses from the supplied reference.');
