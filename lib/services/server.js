import {HttpError} from '../server/http.js';
export const serviceSandbox=()=>process.env.RELOO_ENVIRONMENT==='staging'&&process.env.RELOO_SERVICE_SANDBOX==='true';
export function requireServiceSandbox(){if(!serviceSandbox())throw new HttpError(503,'SERVICE_NOT_OPEN','SERVICE_NOT_OPEN');}
export const serviceUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
