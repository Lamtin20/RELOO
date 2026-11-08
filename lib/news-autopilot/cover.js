import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const asset=name=>fileURLToPath(new URL('./assets/'+name,import.meta.url));
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export async function renderNewsCover(title,publisher,category='Tin thiết bị',generatedScene=null){
 if(generatedScene){
  const photo=await sharp(generatedScene).resize(1200,560,{fit:'cover'}).png().toBuffer();
  const logo=await sharp(asset('logo.webp')).resize({width:100,height:34,fit:'inside'}).png().toBuffer();
  const label=await sharp({text:{text:'<span foreground="#355546">'+escape(category)+'</span>',font:'Be Vietnam Pro Bold',fontfile:asset('BeVietnamPro-Bold.ttf'),width:760,height:20,rgba:true}}).png().toBuffer();
  const caption=await sharp({text:{text:'<span foreground="#64796e">Ảnh minh họa</span>',font:'Be Vietnam Pro Bold',fontfile:asset('BeVietnamPro-Bold.ttf'),width:116,height:16,rgba:true}}).png().toBuffer();
  return sharp({create:{width:1200,height:630,channels:3,background:'#fbfcf9'}}).composite([{input:photo,top:0,left:0},{input:logo,top:579,left:24},{input:label,top:585,left:150},{input:caption,top:589,left:1056}]).webp({quality:84}).toBuffer();
 }
 const finance=/tài chính|đầu tư/i.test(category),environment=/môi trường/i.test(category);
 const colors=finance?['#103757','#1a6380','#f4d58a','#fff0c4']:environment?['#173e32','#32674a','#bbed92','#d7f5bb']:['#073f3c','#006c61','#a9dce6','#d2f2f6'];
 const background=Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1050" cy="350" r="310" fill="${colors[2]}"/><circle cx="1080" cy="320" r="240" fill="${colors[3]}"/><path d="M0 600Q650 460 1200 600V630H0" fill="${colors[1]}"/><rect x="48" y="30" width="164" height="76" rx="16" fill="#fff"/></svg>`);
 const headline=await sharp({text:{text:'<span foreground="#ffffff">'+escape(title)+'</span>',font:'Be Vietnam Pro Bold',fontfile:asset('BeVietnamPro-Bold.ttf'),width:650,height:270,rgba:true}}).png().toBuffer();
 const eyebrow=await sharp({text:{text:'<span foreground="#bbed92">'+escape('RELOO / '+category.toUpperCase())+'</span>',font:'Be Vietnam Pro Bold',fontfile:asset('BeVietnamPro-Bold.ttf'),width:620,height:28,rgba:true}}).png().toBuffer();
 const caption=await sharp({text:{text:'<span foreground="#d9eee6">'+escape('Nguồn: '+publisher+' · Ảnh minh họa')+'</span>',font:'Be Vietnam Pro Bold',fontfile:asset('BeVietnamPro-Bold.ttf'),width:690,height:24,rgba:true}}).png().toBuffer();
 const fade=Buffer.from('<svg width="560" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a"><stop stop-color="white" stop-opacity="0"/><stop offset=".3" stop-color="white"/></linearGradient></defs><rect width="560" height="630" fill="url(#a)"/></svg>');
 const mascot=generatedScene?await sharp(generatedScene).resize({width:560,height:630,fit:'cover'}).ensureAlpha().composite([{input:fade,blend:'dest-in'}]).png().toBuffer():await sharp(asset('reloop.webp')).resize({width:390,height:450,fit:'inside'}).png().toBuffer();
 const logo=await sharp(asset('logo.webp')).resize({width:140,height:60,fit:'inside'}).png().toBuffer();
 const whiteHeadline=headline;
 return sharp(background).composite([{input:mascot,left:generatedScene?640:790,top:generatedScene?0:145},{input:eyebrow,left:60,top:125},{input:whiteHeadline,left:60,top:190},{input:caption,left:60,top:545},{input:logo,left:60,top:40}]).webp({quality:86}).toBuffer();
}
