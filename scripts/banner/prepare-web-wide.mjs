import sharp from 'sharp';
for(const name of ['rent','sale','affiliate']){
 const source=`output/banner/assets/${name}-ai.png`;
 const background=await sharp(source).extract({left:0,top:0,width:250,height:1024}).resize(1920,960,{fit:'fill'}).blur(35).toBuffer();
 const foreground=await sharp(source).resize(880,880).png().toBuffer();
 const mask=Buffer.from('<svg width="880" height="880"><defs><radialGradient id="a"><stop offset="65%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="880" height="880" fill="url(#a)"/></svg>');
 const layer=await sharp(foreground).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 await sharp(background).composite([{input:layer,left:1000,top:40}]).webp({quality:90}).toFile(`public/images/campaigns/${name}-wide-v3.webp`);
}
