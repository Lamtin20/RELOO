import {Capacitor,registerPlugin} from '@capacitor/core';
export const RelooDevice=registerPlugin('RelooDevice');
export const RelooGoogle=registerPlugin('RelooGoogle');
export const googleAvailable=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('RelooGoogle');
export const deviceAvailable=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('RelooDevice');
export async function chooseNativeVideo(){if(!deviceAvailable())return null;const file=await RelooDevice.chooseVideo();if(file.cancelled)return null;const response=await fetch(Capacitor.convertFileSrc('file://'+file.path));if(!response.ok)throw Error('Chưa đọc được video đã chọn.');return new File([await response.blob()],file.name,{type:file.type});}
