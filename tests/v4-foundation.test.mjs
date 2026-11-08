import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RELOO_FOUNDATION as tokens} from '../lib/design/foundation.js';
import {contrastRatio,RELOO_PALETTE} from '../lib/design/palette.js';
import {searchBoxCopy} from '../lib/i18n/search-box.js';
test('V4 primitives reuse the established palette with readable text/CTA combinations',()=>{
 assert.equal(tokens.colors.brand,RELOO_PALETTE.brand.value);
 for(const role of ['brand','ink','muted','danger'])assert.ok(contrastRatio(tokens.colors[role],tokens.colors.surface)>=4.5,role);
 assert.ok(tokens.targets.touch>=44);assert.ok(tokens.targets.focusWidth>=2);
});
test('web primitive values stay consistent with platform-neutral source',async()=>{
 const css=await readFile('app/v4-foundation.css','utf8');
 for(const [key,value] of Object.entries(tokens.spacing))assert.ok(css.includes(`--reloo-space-${key}:${value}px`));
 for(const [key,value] of Object.entries(tokens.radii))assert.ok(css.includes(`--reloo-radius-${key}:${value}px`));
 assert.match(css,/prefers-reduced-motion/);
});
test('search interaction vocabulary is complete and nonempty in both supported locales',()=>{
 const keys=Object.keys(searchBoxCopy['vi-VN']).sort();assert.deepEqual(Object.keys(searchBoxCopy['en-US']).sort(),keys);
 for(const locale of ['vi-VN','en-US'])for(const key of keys)assert.ok(typeof searchBoxCopy[locale][key]==='string'&&searchBoxCopy[locale][key].trim(),locale+':'+key);
});
