import {readFile,unlink} from 'node:fs/promises';
import {requireAccount} from '@/lib/security/authorization';
import {assertOrigin,errorResponse,rateLimit} from '@/lib/server/http';
import {privatePhotoPath} from '@/lib/maps/private-photo';
export async function GET(request,{params}){try{const {profile}=await requireAccount(request,{active:false});rateLimit(request,'private-location-photo-read:'+profile.id,60,60000);const path=privatePhotoPath(profile.id,(await params).id);return new Response(await readFile(path),{headers:{'Content-Type':'image/webp','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}catch{return new Response(null,{status:404})}}
export async function DELETE(request,{params}){try{assertOrigin(request);const {profile}=await requireAccount(request,{active:false});rateLimit(request,'private-location-photo-delete:'+profile.id,20,60000);await unlink(privatePhotoPath(profile.id,(await params).id));return Response.json({ok:true});}catch(e){return errorResponse(e)}}
