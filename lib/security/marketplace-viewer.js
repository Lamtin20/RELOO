import {requireAccount} from './authorization.js';
export async function marketplaceViewer(request){try{const {profile}=await requireAccount(request,{active:false});let canModerate=false;if(profile.role==='admin')try{await requireAccount(request,{admin:true});canModerate=true;}catch{}return {id:profile.id,canModerate};}catch{return {id:null,canModerate:false};}}
