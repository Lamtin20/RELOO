import { spawn } from "node:child_process";
import { join,resolve,sep } from "node:path";
import { mkdir, writeFile, readFile, unlink, stat,rm,link,rename } from "node:fs/promises";
import { MEDIA_ROOT } from "../content/media.js";
import {shortEdit} from './edit.js';
import { encodingLadder,videoFilter,renditionPeakBandwidth,canPreserveSource,SHORT_STREAM_VERSION,SHORT_OUTPUT_MAX_BYTES } from './encoding.js';
import { HttpError } from "../server/http.js";
import {encodeWebp} from '../images/webp.js';
import {
  SHORT_MAX_BYTES,
  validateVideoProbe,
  videoInputFormat,
} from "./validation.js";
export const SHORT_ROOT = join(MEDIA_ROOT, "shorts");
function command(binary, args, timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("VIDEO_PROCESSING_TIMEOUT"));
    }, timeout);
    child.stdout.on("data", (data) => {
      output += data;
      if (output.length > 1000000) child.kill();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(new Error("VIDEO_PROCESSING_FAILED"));
    });
  });
}
function inputOptions(bytes) {
  const format = videoInputFormat(bytes);
  return [
    "-protocol_whitelist",
    "file,pipe",
    "-f",
    format,
    ...(format === "mov"
      ? ["-enable_drefs", "0", "-use_absolute_path", "0"]
      : []),
  ];
}
async function probe(path, options = []) {
  const result = JSON.parse(
    await command(
      process.env.FFPROBE_PATH || "ffprobe",
      [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        ...options,
        path,
      ],
      15000,
    ),
  );
  if (!Number.isFinite(Number(result.format?.duration))) {
    const packets = await command(
      process.env.FFPROBE_PATH || "ffprobe",
      [
        "-v",
        "error",
        ...options,
        "-select_streams",
        "v:0",
        "-show_entries",
        "packet=pts_time,duration_time",
        "-of",
        "csv=p=0",
        path,
      ],
      15000,
    );
    let start = Infinity,
      end = -Infinity;
    for (const line of packets.trim().split(/\r?\n/)) {
      const [pts, duration] = line.split(",").map(Number);
      if (Number.isFinite(pts)) {
        start = Math.min(start, pts);
        end = Math.max(end, pts + (Number.isFinite(duration) ? duration : 0));
      }
    }
    result.format = { ...result.format, duration: end - start };
  }
  const video=result.streams?.find(s=>s.codec_type==='video'),audio=result.streams?.find(s=>s.codec_type==='audio'),rate=(video?.avg_frame_rate||'0/1').split('/').map(Number);
  return {...validateVideoProbe(result),colorTransfer:video?.color_transfer,rotation:Number(video?.side_data_list?.find(s=>s.rotation!==undefined)?.rotation||video?.tags?.rotate||0),codec:video?.codec_name,pixelFormat:video?.pix_fmt,audioCodec:audio?.codec_name,frameRate:rate[0]/rate[1],bitRate:Number(video?.bit_rate||result.format?.bit_rate||0)};
}
export async function stageShort(file, id,edits={}) {
  if (
    !file ||
    typeof file.arrayBuffer !== "function" ||
    file.size <= 0 ||
    file.size > SHORT_MAX_BYTES ||
    !["video/mp4", "video/webm", "video/quicktime"].includes(file.type)
  )
    throw new HttpError(400, "Chọn MP4, MOV hoặc WebM, tối đa 80 MB.");
  await mkdir(SHORT_ROOT, { recursive: true });
  const input = join(SHORT_ROOT, id + ".input");
  try {
    const bytes = Buffer.from(await file.arrayBuffer()),
      options = inputOptions(bytes);
    await writeFile(input, bytes, { mode: 0o600, flag: "wx" });
    const {duration,width,height}=await probe(input,options);
    let edit;try{edit=shortEdit(edits,duration);}catch(e){throw new HttpError(400,e.message);}
    return {
      duration:edit.end-edit.start,width,height,edit_instructions:edit,
      filename: id + ".mp4",
      bytes: file.size,
      status: "PROCESSING",
    };
  } catch (error) {
    await unlink(input).catch(() => {});
    throw error;
  }
}
export async function processShort(id,edits={}) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("VIDEO_ID_INVALID");
  const input = join(SHORT_ROOT, id + ".input"),output=join(SHORT_ROOT,id+'.mp4');
  try {
    const streaming=await packageShort(id,input,true,edits),{duration,width,height}=await probe(output);
    const sourceBytes=(await stat(input)).size;
    await rename(input,join(SHORT_ROOT,id+'.source'));
    return {
      duration,width,height,
      ...streaming,
      source_filename:id+'.source',source_bytes:sourceBytes,
      filename: id + ".mp4",
      bytes: (await stat(output)).size,
      status: "READY",
    };
  } catch (error) {
    await unlink(output).catch(() => {});
    throw error;
  } finally {
    await unlink(input).catch(() => {});
  }
}
export async function packageShort(id,input=null,replaceOriginal=false,edits={}){
 if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('VIDEO_ID_INVALID');
 if(!input)input=await stat(join(SHORT_ROOT,id+'.source')).then(()=>join(SHORT_ROOT,id+'.source')).catch(()=>join(SHORT_ROOT,id+'.mp4'));
 const root=resolve(SHORT_ROOT),temporary=join(root,id,'hls-v'+SHORT_STREAM_VERSION+'-building'),ready=join(root,id,'hls-v'+SHORT_STREAM_VERSION);
 if(!temporary.startsWith(root+sep)||!ready.startsWith(root+sep))throw Error('INVALID_STREAM_DIRECTORY');
 await mkdir(temporary,{recursive:true});
 try{
  const options=inputOptions((await readFile(input)).subarray(0,16)),source=await probe(input,options),edit=shortEdit(edits,source.duration),ladder=encodingLadder(source),levels=[];
  let preserve=false;if(replaceOriginal&&canPreserveSource(source,edit)){const stamps=await command(process.env.FFPROBE_PATH||'ffprobe',['-v','error',...options,'-skip_frame','nokey','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','csv=p=0',input],30000);const times=stamps.split(/\r?\n/).filter(s=>s.trim()).map(s=>Number(s.split(',')[0])).filter(Number.isFinite).sort((a,b)=>a-b);preserve=times.length>0&&times[0]<0.1&&times.every((t,i)=>i===0||t-times[i-1]<=2.1)&&source.duration-times.at(-1)<=2.1;}
  for(const level of ladder){
   const dir=join(temporary,String(level.key));await mkdir(dir,{recursive:true});
   const common=['-nostdin','-v','error','-threads','2','-filter_threads','1',...options,'-ss',String(edit.start),'-i',input,'-t',String(edit.end-edit.start),'-map','0:v:0',...(edit.muted?['-an']:['-map','0:a:0?'])];
   // Preserve the highest existing rendition during legacy backfill; never recompress it.
   const copy=(preserve||!replaceOriginal&&edit.start===0&&edit.end===source.duration&&!edit.muted&&input===join(root,id+'.mp4'))&&level===ladder.at(-1)&&level.width===source.width&&level.height===source.height;
   const codecs=copy?['-c:v','copy','-c:a','copy']:['-vf',videoFilter(source,level),'-c:v','libx264','-preset','fast','-crf',String(level.crf),'-r','30','-g','60','-keyint_min','60','-sc_threshold','0','-force_key_frames','expr:gte(t,n_forced*2)','-profile:v','high','-level:v','4.1','-maxrate',String(level.maxrate),'-bufsize',String(level.maxrate*2),'-pix_fmt','yuv420p','-c:a','aac','-b:a',String(level.audio)];
   await command(process.env.FFMPEG_PATH||'ffmpeg',[...common,...codecs,'-map_metadata','-1','-threads','2','-fs',String(SHORT_OUTPUT_MAX_BYTES),'-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_flags','single_file+independent_segments','-hls_segment_type','fmp4','-hls_segment_filename',join(dir,'media.mp4'),'-y',join(dir,'index.m3u8')],600000);
   const info=await probe(join(dir,'media.mp4')),bytes=(await stat(join(dir,'media.mp4'))).size;
   if(Math.abs(info.duration-(edit.end-edit.start))>1.5||bytes>SHORT_OUTPUT_MAX_BYTES)throw Error('SHORT_RENDITION_INCOMPLETE');
   const playlist=await readFile(join(dir,'index.m3u8'),'utf8');levels.push({level:level.key,...info,bytes,peak:renditionPeakBandwidth(playlist)||level.maxrate+level.audio});
  }
  const master=['#EXTM3U','#EXT-X-VERSION:7',...levels.flatMap(l=>[`#EXT-X-STREAM-INF:BANDWIDTH=${Math.max(l.peak,Math.ceil(l.bytes*8/l.duration*1.1))},AVERAGE-BANDWIDTH=${Math.ceil(l.bytes*8/l.duration)},RESOLUTION=${l.width}x${l.height},FRAME-RATE=${Number(l.frameRate.toFixed(3))}`,l.level+'/index.m3u8'])].join('\n')+'\n';
  await writeFile(join(temporary,'master.m3u8'),master);
  await rm(ready,{recursive:true,force:true});await rename(temporary,ready);
  const posterSource=join(SHORT_ROOT,id+'.poster-source.jpg');
  try{
   await command(process.env.FFMPEG_PATH||'ffmpeg',['-nostdin','-v','error','-threads','2',...options,'-ss',String(Math.min(edit.cover,edit.end-0.05)),'-i',input,'-frames:v','1','-vf',videoFilter(source,encodingLadder(source)[0]),'-q:v','2','-y',posterSource],30000);
   const poster=await encodeWebp(await readFile(posterSource),{maxEdge:1280,quality:82,maxBytes:200000});
   await writeFile(join(SHORT_ROOT,id+'.webp'),poster.data);
  }finally{await unlink(posterSource).catch(()=>{});}
  if(replaceOriginal){const output=join(SHORT_ROOT,id+'.mp4'),replacement=join(SHORT_ROOT,id+'.stream.mp4');await unlink(replacement).catch(()=>{});await link(join(ready,String(levels.at(-1).level),'media.mp4'),replacement);await rename(replacement,output);}
  return {hls_ready:true,poster_filename:id+'.webp',stream_version:SHORT_STREAM_VERSION,stream_bytes:levels.reduce((sum,l)=>sum+l.bytes,0)};
 }catch(e){await rm(temporary,{recursive:true,force:true});throw e;}
}
