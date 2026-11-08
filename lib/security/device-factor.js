import {createHash} from 'node:crypto';
export function passkeySetFactor(keys){return 'PASSKEY:'+createHash('sha256').update(keys.map(k=>k.id).sort().join('|')).digest('hex');}
