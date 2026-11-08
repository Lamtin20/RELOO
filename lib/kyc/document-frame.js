// Map the visible object-fit:cover guide into source-image pixels.
export function documentGuide(width,height,view,frame){
 const scale=Math.max(view.width/width,view.height/height),ox=(width*scale-view.width)/2,oy=(height*scale-view.height)/2;
 return {x:Math.max(0,(frame.x+ox)/scale),y:Math.max(0,(frame.y+oy)/scale),width:Math.min(width,frame.width/scale),height:Math.min(height,frame.height/scale)};
}
// Unit-square to quadrilateral projective transform (TL, TR, BR, BL).
export function projectCard(corners,u,v){
 const [a,b,c,d]=corners,dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y,det=dx1*dy2-dx2*dy1;
 const g=Math.abs(det)>1e-8?(dx3*dy2-dx2*dy3)/det:0,h=Math.abs(det)>1e-8?(dx1*dy3-dx3*dy1)/det:0,z=g*u+h*v+1;
 return {x:((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/z,y:((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/z};
}
function fit(points){
 if(points.length<12)return null;
 const solve=p=>{const n=p.length,sx=p.reduce((s,p)=>s+p[0],0),sy=p.reduce((s,p)=>s+p[1],0),xx=p.reduce((s,p)=>s+p[0]*p[0],0),xy=p.reduce((s,p)=>s+p[0]*p[1],0),den=n*xx-sx*sx;if(!den)return null;const m=(n*xy-sx*sy)/den;return {m,b:(sy-m*sx)/n};};
 const line=solve(points);if(!line)return null;const inliers=points.filter(([x,y])=>Math.abs(y-line.m*x-line.b)<4);return inliers.length>=12?solve(inliers):null;
}
export function detectCardCorners({data,width,height},guide){
 const gray=(x,y)=>{x=Math.max(0,Math.min(width-1,Math.round(x)));y=Math.max(0,Math.min(height-1,Math.round(y)));const i=(y*width+x)*4;return (data[i]*.299+data[i+1]*.587+data[i+2]*.114);};
 const {x,y,width:w,height:h}=guide;
 function edge(horizontal,position,start,length){const pts=[],radius=Math.round((horizontal?h:w)*.12);for(let i=0;i<32;i++){const along=start+length*(.1+.8*i/31);let best=0,at=null;for(let shift=-radius;shift<=radius;shift++){const p=position+shift,contrast=Math.abs(horizontal?gray(along,p-2)-gray(along,p+2):gray(p-2,along)-gray(p+2,along)),score=contrast/(1+Math.abs(shift)/Math.max(1,radius));if(score>best&&contrast>32){best=score;at=p;}}if(at!=null)pts.push([along,at]);}return fit(pts);}
 const top=edge(true,y,x,w),bottom=edge(true,y+h,x,w),left=edge(false,x,y,h),right=edge(false,x+w,y,h);
 if(!top||!bottom||!left||!right)return null;
 const cross=(hor,ver)=>{const cy=(hor.m*ver.b+hor.b)/(1-hor.m*ver.m);return {x:ver.m*cy+ver.b,y:cy};};
 const corners=[cross(top,left),cross(top,right),cross(bottom,right),cross(bottom,left)],expected=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
 if(corners.some((p,i)=>!Number.isFinite(p.x+p.y)||p.x<0||p.y<0||p.x>=width||p.y>=height||Math.abs(p.x-expected[i].x)>w*.2||Math.abs(p.y-expected[i].y)>h*.2))return null;
 return corners;
}
export function captureDocument(video,frame){
 const source=document.createElement('canvas'),scale=Math.min(1,2560/Math.max(video.videoWidth,video.videoHeight));source.width=Math.round(video.videoWidth*scale);source.height=Math.round(video.videoHeight*scale);
 const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,source.width,source.height);
 const view=video.getBoundingClientRect(),box=frame.getBoundingClientRect(),guide=documentGuide(source.width,source.height,view,{x:box.left-view.left,y:box.top-view.top,width:box.width,height:box.height});
 const detection=document.createElement('canvas'),ds=Math.min(1,960/Math.max(source.width,source.height));detection.width=Math.round(source.width*ds);detection.height=Math.round(source.height*ds);const dc=detection.getContext('2d',{willReadFrequently:true});dc.drawImage(source,0,0,detection.width,detection.height);
 const detected=detectCardCorners(dc.getImageData(0,0,detection.width,detection.height),{x:guide.x*ds,y:guide.y*ds,width:guide.width*ds,height:guide.height*ds}),corners=detected?.map(p=>({x:p.x/ds,y:p.y/ds}));
 const result=document.createElement('canvas');result.width=Math.min(2400,Math.round(guide.width));result.height=Math.round(result.width*54/85.6);const out=result.getContext('2d');out.imageSmoothingQuality='high';
 if(!corners){out.drawImage(source,guide.x,guide.y,guide.width,guide.height,0,0,result.width,result.height);return result;}
 const pixels=ctx.getImageData(0,0,source.width,source.height),rectified=out.createImageData(result.width,result.height);
 for(let y=0;y<result.height;y++)for(let x=0;x<result.width;x++){const p=projectCard(corners,x/(result.width-1),y/(result.height-1)),sx=Math.min(source.width-2,Math.max(0,Math.floor(p.x))),sy=Math.min(source.height-2,Math.max(0,Math.floor(p.y))),fx=p.x-sx,fy=p.y-sy,i=(y*result.width+x)*4,a=(sy*source.width+sx)*4,b=a+source.width*4;for(let k=0;k<3;k++)rectified.data[i+k]=(pixels.data[a+k]*(1-fx)+pixels.data[a+4+k]*fx)*(1-fy)+(pixels.data[b+k]*(1-fx)+pixels.data[b+4+k]*fx)*fy;rectified.data[i+3]=255;}
 out.putImageData(rectified,0,0);return result;
}
