let library,attempt=0;
// Stable, self-hosted module: an already-open verification flow must not depend
// on a code-split chunk belonging to a retired Next build.
export function loadFaceLibrary(){
 if(!library){const url='/vision/mediapipe-0.10.32/vision_bundle.mjs'+(attempt?'?retry='+attempt:'');
  library=import(/* webpackIgnore: true */ url).catch(()=>{library=null;attempt++;throw Error('Chưa tải được bộ xử lý khuôn mặt. Kiểm tra kết nối rồi bấm mở lại máy ảnh.');});
 }
 return library;
}
export async function encodeCapture(canvas){
 for(const quality of [.96,.92,.88,.84]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=2000000)return blob;}
 throw Error('Ảnh vượt dung lượng cho phép. Hãy chụp lại với thẻ nằm gọn trong khung.');
}
