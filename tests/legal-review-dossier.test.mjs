import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
test('owner commercial assertion never becomes an invented asset license or legal publication approval',async()=>{
 const owner=JSON.parse(await readFile('compliance/owner-decisions.json','utf8')),assets=JSON.parse(await readFile('compliance/asset-provenance.json','utf8'));
 assert.equal(owner.company.legalName,null);assert.equal(owner.company.legalApproval,null);assert.equal(owner.publication.status,'DRAFT_NOT_SUBMITTED_NOT_APPROVED');assert.equal(owner.assets.status,'OWNER_ATTESTED_COMMERCIAL_USE');assert.equal(assets.status,'INCOMPLETE');
 for(const a of assets.assets){if(a.status==='OWNER_SUPPLIED_PENDING_RIGHTS_DOCUMENT'){assert.ok(a.origin.startsWith('User-supplied reference:'));assert.equal(a.license,null);assert.ok(a.derivativeChain.length);assert.equal(a.ownerAttestation,undefined)}else if(a.ownerAttestation){assert.equal(a.ownerAttestation.assetSha256,a.sha256);assert.equal(a.ownerAttestation.status,'OWNER_ATTESTED_COMMERCIAL_USE')}else{assert.equal(a.status,'NEEDS_PROVENANCE_REVIEW');assert.equal(a.license,null);assert.equal(a.origin,null)}assert.equal(a.approval,null)}
});
test('review dossier retains all delivery sections and exact official-source references without pretending full approval',async()=>{
 for(const name of ['README.md','01_OWNER_DECISIONS.md','02_SERVICE_RIGHTS_MATRIX.md','03_DATA_RETENTION_DELETION.md','04_PROCEDURES_AND_FILINGS.md','05_REVIEW_TEMPLATES.md','06_SOURCE_REGISTER.md','07_IMPLEMENTATION_GAPS.md'])await access('docs/compliance/legal-review/'+name);
 const register=JSON.parse(await readFile('docs/compliance/legal-review/source-register.json','utf8'));
 assert.ok(register.sources.length>=10);for(const s of register.sources){assert.equal(new URL(s.url).hostname,'vanban.chinhphu.vn');assert.equal(s.checkedAt,undefined);assert.ok(s.reviewScope);assert.ok(s.sha256||s.error)}
});
