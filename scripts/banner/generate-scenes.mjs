import {mkdir,writeFile} from 'node:fs/promises';
import {editImage} from './vibi-images.mjs';
await mkdir('output/banner/assets',{recursive:true});
const briefs={
 rent:'Emotion: excited open-mouth smile. Action: joyful small leap, holding a rolled camping mat. Scene: premium miniature weekend campsite, sculptural pale sand ground, soft sage hills and a simple tent in the distance. Warm sunrise, cinematic soft-touch 3D. Colors cream, mint, teal and green. Adventure and freedom.',
 sale:'Emotion: warm friendly smile. Action: presenting a small plain reusable cardboard package with both hands. Scene: elegant circular economy studio with restrained mint infinity ribbon curving behind the mascot, dark navy and deep teal backdrop, soft blue rim lighting. Trust and giving an object another life.',
 affiliate:'Emotion: delighted smile with eyes gently closed. Action: celebratory gesture beside three tasteful plain pastel gift packages, restrained green and peach confetti. Scene: premium peach and off-white studio, soft warm spotlight. Joy and thoughtful shopping. No discount percentages or price tags.',
};
const report=[];
for(const [name,brief]of Object.entries(briefs)){
 const prompt=`Use case: ads-marketing / identity-preserve. Asset: artwork only for a RELOO campaign banner. Reference image is the official RELOOP character identity sheet. Reproduce exactly the same RELOOP character, not a replacement robot: large rounded dark teal head, white face panel, large glossy dark eyes with blue reflections, single veined green leaf, symmetrical infinity head loops (not animal ears), blue circular side AI modules, compact teal torso, green gloves and boots, leaf cape, original chest wordmark. Premium glossy silicone finish, controlled highlights, subtle shadows, no excessive bloom. ${brief} Composition: one complete character occupying central-right 60 percent of the square, full silhouette including leaf and boots within 8 percent safe margins. Left 25 percent calm negative space. No extra characters, no lettering, no slogans, no watermark, no UI, no newly invented logos; only preserve the original chest marking. Product props are generic scene decorations, not replicas of official products. Preserve reference identity while adapting the approved expression and action.`;
 await writeFile(`output/banner/assets/${name}-prompt.txt`,prompt);
 console.log(`Requesting ${name} scene once.`);
 try{report.push({...await editImage({prompt,reference:'public/mascot/reloop/approved-v3/reference.png',output:`output/banner/assets/${name}-ai.png`}),name,status:'generated'});console.log(`${name}: image saved.`);}
 catch(error){report.push({name,status:'missing',error:error.message});console.log(`${name}: ${error.message}`);}
 await writeFile('output/banner/generation-report.json',JSON.stringify(report,null,2));
}
