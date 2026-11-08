import {stagingProblems} from '../lib/runtime/staging.js';
const issues=stagingProblems(process.env);
if(issues.length){console.error(JSON.stringify({ok:false,status:'BLOCKED',issues},null,2));process.exitCode=1}
else console.log(JSON.stringify({ok:true,scope:'Configuration only; DNS, TLS, resource identity, egress and real workflows remain to verify.',resource:process.env.STAGING_RESOURCE_ID}));
