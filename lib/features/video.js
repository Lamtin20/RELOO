// Paused for this release. Retain stored media/history for a reversible rollout.
export const VIDEO_ENABLED=false;
export function pausedVideoPath(path){try{path=decodeURIComponent(path);}catch{return false;}return /^\/(?:shorts|dashboard\/shorts|api\/shorts|api\/crm\/shorts)(?:\/|$)/.test(path);}
