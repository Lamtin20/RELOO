import {documentGuide} from './document-frame.js';
function date(value){if(!/^\d{8}$/.test(value))throw Error('Ngày trên mã QR không hợp lệ.');const iso=value.slice(4)+'-'+value.slice(2,4)+'-'+value.slice(0,2),d=new Date(iso+'T00:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==iso)throw Error('Ngày trên mã QR không hợp lệ.');return iso;}
export function parseIdentityQr(raw,now=new Date()){
 if(typeof raw!=='string'||raw.length>1800)throw Error('Mã QR căn cước không hợp lệ.');
 const values=raw.trim().split('|').map(value=>value.trim());
 // Some issued cards append reserved, empty fields. Never discard non-empty data.
 while(values.length>7&&values.at(-1)==='')values.pop();
 if(values.length!==7)throw Error('Mã QR không đúng định dạng. Vui lòng dùng mã QR trên CCCD hoặc thẻ Căn cước.');
 const [nationalId,oldId,name,dob,gender,address,issued]=values.map(v=>v.trim());
 if(!/^\d{12}$/.test(nationalId)||oldId&&!/^(?:\d{9}|\d{12})$/.test(oldId)||name.length<2||name.length>100||address.length<3||address.length>600||!['Nam','Nữ','Nu','Male','Female'].includes(gender)||/[\x00-\x1f]/.test(name+address))throw Error('Mã QR không đúng định dạng. Vui lòng dùng mã QR trên CCCD hoặc thẻ Căn cước.');
 const birthDate=date(dob),issueDate=date(issued),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(now);
 if(birthDate<'1900-01-01'||birthDate>issueDate||issueDate>today)throw Error('Ngày sinh hoặc ngày cấp trong mã QR chưa hợp lệ.');
 return {nationalId,oldId,name,birthDate,gender:['Nữ','Nu','Female'].includes(gender)?'Nữ':'Nam',residence:address,issueDate,source:'CARD_QR',verified:false};
}
let reader;
export function prepareIdentityQrReader(){
 if(!reader)reader=import('zxing-wasm/reader').then(async qrReader=>{
  await qrReader.prepareZXingModule({overrides:{locateFile:path=>path.endsWith('.wasm')?'/vision/zxing_reader-3.1.6.wasm':path},fireImmediately:true});
  return qrReader;
 }).catch(()=>{reader=null;throw Error('Chưa tải được bộ đọc QR. Kiểm tra kết nối rồi mở lại máy ảnh.');});
 return reader;
}
export async function decodeIdentityQrImage(image){
 const qrReader=await prepareIdentityQrReader();
 let results;try{results=await qrReader.readBarcodes(image,{formats:['QRCode'],tryHarder:true,tryRotate:true,tryInvert:true,tryDownscale:true,maxNumberOfSymbols:1,textMode:'Plain'});}catch{throw Error('Bộ đọc QR chưa xử lý được ảnh. Hãy mở lại máy ảnh để thử lại.');}
 const found=results.find(result=>result.isValid);
 return found?{fields:parseIdentityQr(found.text),payload:found.text}:null;
}
export async function scanIdentityFrame(video,frame=null){
 if(!video?.videoWidth||!video.videoHeight)return null;
 const view=frame?video.getBoundingClientRect():null,box=frame?.getBoundingClientRect(),guide=frame?documentGuide(video.videoWidth,video.videoHeight,view,{x:box.left-view.left,y:box.top-view.top,width:box.width,height:box.height}):{x:0,y:0,width:video.videoWidth,height:video.videoHeight};
 // Include quiet-zone margin around the visible guide; also search the full sensor
 // if a QR is partly outside the guide. Preserve dense-code resolution.
 const margin=Math.min(guide.width,guide.height)*.18,x=Math.max(0,guide.x-margin),y=Math.max(0,guide.y-margin);
 const regions=[{x,y,width:Math.min(video.videoWidth-x,guide.width+margin*2),height:Math.min(video.videoHeight-y,guide.height+margin*2)}];
 if(frame)regions.push({x:0,y:0,width:video.videoWidth,height:video.videoHeight});
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 for(const region of regions){const ratio=Math.min(1,1600/Math.max(region.width,region.height));canvas.width=Math.max(1,Math.round(region.width*ratio));canvas.height=Math.max(1,Math.round(region.height*ratio));ctx.drawImage(video,region.x,region.y,region.width,region.height,0,0,canvas.width,canvas.height);const result=await decodeIdentityQrImage(ctx.getImageData(0,0,canvas.width,canvas.height));if(result)return result;}
 return null;
}
