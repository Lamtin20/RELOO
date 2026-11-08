import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url),{Client}=require('ssh2');
const pinned=createHash('sha256').update(Buffer.from('AAAAC3NzaC1lZDI1NTE5AAAAIA0DIIclMQO1BoTJF20LB2alsX9GNVrrJmpagcf/YJQa','base64')).digest('hex');
function bound(promise,ms=12000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('SSH_OPERATION_TIMEOUT')),ms);})]).finally(()=>clearTimeout(timer));}
export async function connect(password){
  const client=new Client();
  await bound(new Promise((resolve,reject)=>client.once('ready',resolve).once('error',reject).connect({host:'100.107.146.119',username:'root',password,hostHash:'sha256',hostVerifier:hash=>hash===pinned,readyTimeout:10000,keepaliveInterval:5000}))).catch(error=>{client.destroy();throw error;});
  const sftp=await bound(new Promise((resolve,reject)=>client.sftp((error,value)=>error?reject(error):resolve(value))));
  const exec=(command,ms=12000)=>bound(new Promise((resolve,reject)=>client.exec(command,(error,stream)=>{if(error)return reject(error);let output='';stream.on('data',chunk=>output+=chunk);stream.stderr.on('data',chunk=>output+=chunk);stream.on('close',code=>resolve({code,output}));})),ms);
  const read=path=>bound(new Promise((resolve,reject)=>sftp.readFile(path,(error,value)=>error?reject(error):resolve(value))));
  const write=(path,value)=>bound(new Promise((resolve,reject)=>sftp.writeFile(path,value,{mode:0o600},error=>error?reject(error):resolve())));
  return {client,sftp,exec,read,write,close:()=>client.end()};
}
