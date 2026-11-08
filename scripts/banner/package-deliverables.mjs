import sharp from 'sharp';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('output/banner/preview',{recursive:true});
const layers=[];
for(const [i,name]of ['rent','sale','affiliate'].entries()){
 await sharp(`output/banner/${name}-desktop.png`).resize(960,540).png().toFile(`output/banner/preview/${name}-desktop.png`);
 await sharp(`output/banner/${name}-mobile.png`).resize(432,540).png().toFile(`output/banner/preview/${name}-mobile.png`);
 layers.push({input:await sharp(`output/banner/${name}-desktop.png`).resize(960,540).png().toBuffer(),left:0,top:i*560});
 layers.push({input:await sharp(`output/banner/${name}-mobile.png`).resize(432,540).png().toBuffer(),left:980,top:i*560});
}
await sharp({create:{width:1412,height:1660,channels:4,background:'#e7ece8'}}).composite(layers).png().toFile('output/banner/preview/overview.png');
await copyFile('scripts/banner/build-sources.mjs','output/banner/build-sources.mjs');
await writeFile('output/banner/README.md',`# RELOO campaign banners

Three campaigns: rental/adventure, buy/sell/circular economy, affiliate shopping.
Desktop exports: 1920×1080 PNG. Mobile exports: 1080×1350 PNG.
Editable sources: six HTML files with inline layout CSS, shared fonts.css and assets. Open the HTML in a browser; all image and font assets are local. Text remains editable HTML. content.json contains the campaign copy.

Preview: preview/overview.png and six smaller PNGs.
Generation: gpt-image-2 via https://vibi.top/v1/images/edits, reference-image editing, one request per scene, synchronous base64 PNG response. Actual call results are in generation-report.json; prompts are assets/*-prompt.txt. No text model was used.

Provider verification: existing provider-config.json uses gpt-image-2; authenticated /v1/models listed this model. Existing successful generation/edit logs independently established the Image API protocol; this run confirmed editing with multipart image and base64 PNG. No automatic retries, no secret values written to files. New API code is scripts/banner/vibi-images.mjs; the launcher reuses the encrypted workspace credential.

Artwork: AI adaptation of approved RELOOP reference, visually checked against head leaf, infinity loops, blue modules, white face, teal body, gloves, boots, cape and chest marking. AI output is not an exact pixel copy; chest marking is generated within the scene. Official RELOO logo is composited from the project asset without alteration. Generic gifts/camping decorations are not official product replicas.

Fonts: Be Vietnam Pro from the existing Next.js local font cache, SIL Open Font License (included under assets/fonts/OFL.txt). Final lettering is browser-rendered Vietnamese, not AI-rendered text.

No numerical promotion/price/guaranteed cashback claim was added. These are evergreen campaigns. No mandatory information remains pending for this brief; a specific discount campaign would need its amount, validity and terms before inclusion.

Rendered and visually inspected all desktop/mobile PNGs. Outputs remain local and have not been published or uploaded to the website.
`);
console.log('Previews and editable delivery documentation prepared.');
