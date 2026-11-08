import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArticle,articleOutline} from '../lib/content/article-outline.js';
import {readFile} from 'node:fs/promises';
test('Vietnamese headings create stable, unique anchors with matching visible labels',()=>{
 const outline=articleOutline(parseArticle('## Giá thuê & tiền cọc\n\n### Đồ cần mang\n\n## Giá thuê & tiền cọc'));
 assert.deepEqual(outline.map(h=>h.id),['gia-thue-tien-coc','do-can-mang','gia-thue-tien-coc-2']);
 assert.deepEqual(outline.map(h=>h.depth),[2,3,2]);
 assert.equal(outline[0].text,'Giá thuê & tiền cọc');
});
test('18 articles have unique slugs, SEO fields, structured sections, inline illustration and contextual CTA',async()=>{
 const articles=JSON.parse(await readFile('output/news/library/articles.json','utf8'));
 assert.equal(articles.length,18);assert.equal(articles.filter(a=>!a.enhanced).length,15);
 assert.equal(new Set(articles.map(a=>a.slug)).size,18);
 for(const a of articles){
  const tree=parseArticle(a.body),outline=articleOutline(tree);
  assert.equal(tree.children.some(n=>n.type==='heading'&&n.depth===1),false,a.slug);
  assert.ok(outline.some(n=>n.depth===2),a.slug);assert.ok(outline.some(n=>n.depth===3),a.slug);
  assert.ok(a.seo_title.length<=80&&a.seo_description.length<=180&&a.excerpt.length<=350,a.slug);
  assert.match(a.body,/!\[[^\]]+\]\(\.\/assets\/.*-inline\.webp\)/);
  assert.match(a.body,/\]\(\/explore|\]\(\/dashboard\/assets\/new/);
  assert.equal(a.status,'DRAFT');
 }
});
