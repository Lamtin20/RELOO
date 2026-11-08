import { createHmac, timingSafeEqual,randomUUID } from "node:crypto";
export const CRM_COOKIE = "reloo-crm-mfa";
export const CRM_SESSION_SECONDS = 8 * 60 * 60;
function sessionKey() {
  const key=process.env.RELOO_PRIVATE_DATA_KEY;
  if (!/^[a-f0-9]{64}$/i.test(key || "")) throw Error("CRM_SESSION_KEY_UNAVAILABLE");
  return createHmac("sha256",Buffer.from(key,"hex")).update("reloo-crm-mfa-session-v1").digest();
}
const sign = value => createHmac("sha256",sessionKey()).update(value).digest("base64url");
export function createCrmReceipt({subject,sessionId,profileId,factorId}, now=Date.now()) {
  if (![subject,sessionId,profileId,factorId].every(v=>typeof v==="string" && v.length>0 && v.length<150)) throw Error("CRM_RECEIPT_INVALID");
  const body={version:1,id:randomUUID(),subject,sessionId,profileId,factorId,issuedAt:Math.floor(now/1000),expiresAt:Math.floor(now/1000)+CRM_SESSION_SECONDS};
  const encoded=Buffer.from(JSON.stringify(body)).toString("base64url");return {id:body.id,value:encoded+"."+sign(encoded),expiresAt:body.expiresAt*1000};
}
export function validCrmReceipt(value,{claims,profileId,factors},now=Date.now()) {
  try {
    if (typeof value!=="string" || value.length>2000 || claims?.aal!=="aal2" || !claims.session_id || Number(claims.exp)*1000<=now) return null;
    const parts=value.split(".");if(parts.length!==2)return null;
    const actual=Buffer.from(parts[1],"base64url"),expected=Buffer.from(sign(parts[0]),"base64url");
    if(actual.length!==expected.length || !timingSafeEqual(actual,expected))return null;
    const body=JSON.parse(Buffer.from(parts[0],"base64url").toString());
    if(body.version!==1 || !/^[a-f0-9-]{36}$/i.test(body.id || "") || body.subject!==claims.sub || body.sessionId!==claims.session_id || body.profileId!==profileId ||
       !Number.isInteger(body.issuedAt)||!Number.isInteger(body.expiresAt)||body.issuedAt>now/1000+30||body.expiresAt<=now/1000||body.expiresAt-body.issuedAt!==CRM_SESSION_SECONDS ||
       !factors?.some(f=>f.id===body.factorId && f.factor_type==="totp" && f.status==="verified"))return null;
    return body;
  }catch{return null;}
}
export function crmCookieValue(request) { return (request.headers.get("cookie") || "").split(";").map(s=>s.trim()).find(s=>s.startsWith(CRM_COOKIE+"="))?.slice(CRM_COOKIE.length+1) || ""; }
