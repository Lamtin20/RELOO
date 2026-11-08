export function playbackWindow(activeIndex,count,{saveData=false,effectiveType='4g'}={}){
 const slow=saveData||['slow-2g','2g','3g'].includes(effectiveType),ahead=slow?1:2;
 return {from:Math.max(0,activeIndex-1),to:Math.min(count-1,activeIndex+ahead),forward:ahead,warmSeconds:2,activeSeconds:slow?6:10,maxBytes:slow?4000000:8000000};
}
export function shouldCountView({active,visible,paused,playingMs}){return !!active&&!!visible&&!paused&&Number.isFinite(playingMs)&&playingMs>=2000;}
let measuredBandwidth=0;
export function rememberBandwidth(value){if(Number.isFinite(value)&&value>100000)measuredBandwidth=value;}
export function playbackBandwidth(connection={}){return connection.saveData?750000:measuredBandwidth||Math.max(100000,Number(connection.downlink||6)*1000000);}
export function initialQualityLevel(levels,{bandwidth=6000000,width=720,saveData=false}={}){
 if(saveData)return 0;
 let chosen=0;
 for(let i=0;i<levels.length;i++){const level=levels[i];if(level.width<=width*1.25&&level.bitrate<=bandwidth*0.85)chosen=i;}
 return chosen;
}
