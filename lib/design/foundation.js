import {RELOO_PALETTE} from './palette.js';
// Framework-neutral primitives. Native consumption is proposed, not implemented.
export const RELOO_FOUNDATION=Object.freeze({
 colors:Object.freeze(Object.fromEntries(Object.entries(RELOO_PALETTE).map(([name,color])=>[name,color.value]))),
 spacing:Object.freeze({1:4,2:8,3:12,4:16,5:20,6:24,8:32,10:40,12:48}),
 radii:Object.freeze({control:12,panel:16,sheet:20}),
 motion:Object.freeze({fast:120,normal:200}),
 targets:Object.freeze({touch:44,focusWidth:3,focusOffset:3}),
});
