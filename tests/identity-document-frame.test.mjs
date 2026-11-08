import test from 'node:test';
import assert from 'node:assert/strict';
import {documentGuide,projectCard,detectCardCorners} from '../lib/kyc/document-frame.js';
test('portrait camera guide maps the visible cover region, rather than cropping the full sensor',()=>{
 const mapped=documentGuide(960,1280,{width:400,height:300},{x:32,y:44,width:336,height:212});
 for(const [key,value] of Object.entries({x:76.8,y:385.6,width:806.4,height:508.8}))assert(Math.abs(mapped[key]-value)<1e-8);
});
test('perspective transform maps all four corners exactly',()=>{
 const corners=[{x:45,y:20},{x:240,y:36},{x:270,y:170},{x:20,y:150}];
 for(const [i,u,v] of [[0,0,0],[1,1,0],[2,1,1],[3,0,1]]){const p=projectCard(corners,u,v);assert(Math.abs(p.x-corners[i].x)<1e-8);assert(Math.abs(p.y-corners[i].y)<1e-8);}
});
test('four high-contrast card borders are detected; a blank scene never invents corners',()=>{
 const width=400,height=300,data=new Uint8ClampedArray(width*height*4),guide={x:40,y:50,width:320,height:200};
 assert.equal(detectCardCorners({data,width,height},guide),null);
 for(let y=50;y<250;y++)for(let x=40;x<360;x++){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=230;data[i+3]=255;}
 const corners=detectCardCorners({data,width,height},guide);assert(corners);assert(Math.abs(corners[0].x-40)<3);assert(Math.abs(corners[2].y-250)<3);
});
