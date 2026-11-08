import {requireAccount} from '../security/authorization.js';
import {requirePermission} from '../operations/permissions.js';
import {analyticsTestAccount} from './test-runtime.js';
export async function analyticsAccount(request,{admin=false}={}){return await analyticsTestAccount(request,{admin})||(admin?requirePermission(request,'traffic.read'):requireAccount(request,{active:false}));}
