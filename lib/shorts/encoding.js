export const SHORT_STREAM_VERSION = 3;
export const SHORT_OUTPUT_MAX_BYTES = 200 * 1024 * 1024;
export function encodingLadder({width,height}) {
  const available=[
    {key:360,width:360,height:640,crf:23,maxrate:1100000,audio:96000},
    {key:720,width:720,height:1280,crf:20,maxrate:4500000,audio:128000},
    {key:1080,width:1080,height:1920,crf:19,maxrate:7500000,audio:128000},
  ].filter((level,i)=>i===0||width>availableWidth(i)||height>availableHeight(i));
  const seen=new Set();
  return available.map(level=>{const scale=Math.min(1,level.width/width,level.height/height);return {...level,width:Math.max(2,Math.floor(width*scale/2)*2),height:Math.max(2,Math.floor(height*scale/2)*2)};}).filter(level=>{const key=level.width+'x'+level.height;if(seen.has(key))return false;seen.add(key);return true;});
}
function availableWidth(index){return index===1?360:720;}
function availableHeight(index){return index===1?640:1280;}
export function videoFilter(info,level){
 const hdr=['smpte2084','arib-std-b67'].includes(info.colorTransfer);
 const tone=hdr?'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=mobius:desat=0,zscale=t=bt709:m=bt709:r=tv,':'';
 return tone+`scale=${level.width}:${level.height}:flags=lanczos,setsar=1,format=yuv420p`;
}
export function renditionPeakBandwidth(manifest){
 let duration=0,peak=0;
 for(const line of manifest.split(/\r?\n/)){if(line.startsWith('#EXTINF:'))duration=Number(line.slice(8).replace(',',''));if(line.startsWith('#EXT-X-BYTERANGE:')&&duration>0){peak=Math.max(peak,Number(line.slice(17).split('@')[0])*8/duration);duration=0;}}
 return Math.ceil(peak*1.05);
}
export function canPreserveSource(info,edit){return info.codec==='h264'&&info.pixelFormat==='yuv420p'&&!info.rotation&&!['smpte2084','arib-std-b67'].includes(info.colorTransfer)&&info.width<=1080&&info.height<=1920&&info.frameRate>0&&info.frameRate<=30.1&&info.bitRate>0&&info.bitRate<=8500000&&(!info.audioCodec||info.audioCodec==='aac')&&edit.start===0&&edit.end===info.duration&&!edit.muted;}
