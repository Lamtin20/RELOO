import fs from 'node:fs/promises';
// Generates a reviewable artifact; never publishes an association file or changes signing.
const team=process.env.RELOO_IOS_TEAM_ID,bundle='vn.reloo.app';
if(!/^[A-Z0-9]{10}$/.test(team||''))throw Error('RELOO_IOS_TEAM_ID_REQUIRED');
const association={applinks:{details:[{appIDs:[team+'.'+bundle],components:[{'/':'/noi-khu'},{'/':'/dashboard/orders/neighborhood'},{'/':'/dashboard/profile/residency'},{'/':'/needs/neighborhood'}]}]}};
await fs.mkdir('output/ios-upgrade/links',{recursive:true});await fs.writeFile('output/ios-upgrade/links/apple-app-site-association',JSON.stringify(association,null,2));
console.log('Association artifact generated. Domain deployment and signed Associated Domains entitlement remain separate approved steps.');
