export function contentSecurityPolicy(nonce,{development=false,authOrigin='https://auth.reloo.vn'}={}){
 const connections=["'self'",authOrigin,'wss://reloo.vn','wss://crm.reloo.vn','https://cdn.jsdelivr.net','https://storage.googleapis.com','https://www.google-analytics.com','https://region1.google-analytics.com','https://www.googletagmanager.com'];
 if(development)connections.push('ws:','http://localhost:3000','http://localhost:3001');
 return [
  "default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${development?" 'unsafe-eval'":''}`,
  "style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https:","font-src 'self' data:",
  'connect-src '+connections.join(' '),"media-src 'self' blob: https:","worker-src 'self' blob:",
  "frame-src 'self' https://www.google.com https://maps.google.com", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self' https://accounts.google.com",
  ...(!development?['upgrade-insecure-requests']:[]),
 ].join('; ');
}
export const SECURITY_HEADERS=[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=(), serial=()'},
 {key:'Strict-Transport-Security',value:'max-age=31536000'},
];
