import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
const articles=JSON.parse(await readFile('output/news/library/articles.json','utf8'));
const layers=[];
for(const [i,a]of articles.entries()){
 if(!a.enhanced)await sharp(`output/news/library/assets/${a.slug}-cover-render.png`).webp({quality:88}).toFile(`output/news/library/assets/${a.slug}-cover.webp`);
 await sharp(`output/news/library/assets/${a.slug}-inline-render.png`).webp({quality:88}).toFile(`output/news/library/assets/${a.slug}-inline.webp`);
 const coverPath=a.enhanced?'output/news/'+a.cover_file.split('/').pop():'output/news/library/'+a.cover_file;
 layers.push({input:await sharp(coverPath).resize(300,158).png().toBuffer(),left:(i%3)*320,top:Math.floor(i/3)*180});
}
await sharp({create:{width:940,height:1060,channels:4,background:'#edf3ef'}}).composite(layers).png().toFile('output/news/library/artwork-overview.png');
console.log('Exported 33 WebP illustrations and contact sheet.');
