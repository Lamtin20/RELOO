import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Share } from "@capacitor/share";
import { Camera,CameraSource,CameraResultType,CameraDirection } from "@capacitor/camera";
import {deviceAvailable,RelooDevice,RelooGoogle,googleAvailable} from './device';
export const isNative = () =>
  typeof window !== "undefined" && Capacitor.isNativePlatform();
export async function nativeCameraPermission() {
  if (isNative()) {
    const result = await Camera.requestPermissions({ permissions: ["camera"] });
    if (result.camera !== "granted")
      throw new Error("Bạn cần cấp quyền máy ảnh để chụp trực tiếp.");
  }
}
export async function nativeCameraPhoto(front=false){let url,path;if(deviceAvailable()){const photo=await RelooDevice.capturePhoto({front});path=photo.path;url=Capacitor.convertFileSrc('file://'+photo.path);}else{const photo=await Camera.getPhoto({source:CameraSource.Camera,resultType:CameraResultType.Uri,direction:front?CameraDirection.Front:CameraDirection.Rear,saveToGallery:false,allowEditing:false,quality:96,width:2400,height:2400});url=photo.webPath;}try{const response=await fetch(url);if(!response.ok)throw Error('Chưa đọc được ảnh camera.');return await response.blob();}finally{if(path)await RelooDevice.deleteCameraPhoto({path}).catch(()=>{});}}
export async function startNativeLogin(next, intent, method='google') {
  if (Capacitor.getPlatform() === "android"&&method==='google') {
    if (!googleAvailable()) throw Error("Hãy cập nhật app Reloo để đăng nhập Google ngay trong ứng dụng.");
    const post = async body => {
      const response = await fetch("/api/auth/google/native",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
      const data = await response.json();
      if(!response.ok) throw Error(data.error || "Chưa đăng nhập được Google.");
      return data;
    };
    const request = await post({action:"prepare",next,intent});
    const credential = await RelooGoogle.signIn({clientId:request.clientId,nonce:request.nonce});
    return post({action:"complete",idToken:credential.idToken});
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32)),
    verifier = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, ""),
    hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier),
    ),
    challenge = [...new Uint8Array(hash)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  const response = await fetch("/api/mobile/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenge, next, intent, enroll:method==='passkey-enroll' }),
    }),
    data = await response.json();
  if (!response.ok) throw new Error(data.error);
  sessionStorage.setItem(
    "reloo-native-auth",
    JSON.stringify({ flow: data.flow, verifier, expires: Date.now() + 300000 }),
  );
  await Browser.open({ url: data.url+(method==='apple'?'&method=apple':method.startsWith('passkey')?'&method=passkey'+(method==='passkey-enroll'?'&enroll=1':''):''), toolbarColor: "#087f56" });
}
export async function clearNativeGoogleSession(){if(googleAvailable())await RelooGoogle.signOut().catch(()=>{});}
export async function shareShort(url) {
  if (isNative())
    return Share.share({
      title: "Video RELOO",
      text: "Khám phá món đồ trong video RELOO",
      url,
      dialogTitle: "Chia sẻ video",
    });
  if (navigator.share) return navigator.share({ title: "Video RELOO", url });
  await navigator.clipboard.writeText(url);
  return { copied: true };
}
