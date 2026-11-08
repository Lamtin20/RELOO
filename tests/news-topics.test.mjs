import test from 'node:test';import assert from 'node:assert/strict';
import{NEWS_TOPICS,topicForArticle,filterNews,topicBySlug}from'../lib/content/news-topics.js';
test('six topics have unique URLs and financial/environmental categories stay separate',()=>{
 assert.equal(new Set(NEWS_TOPICS.map(t=>t.slug)).size,6);
 assert.equal(topicForArticle({category:'Tài chính cá nhân'}).slug,'tai-chinh-ca-nhan');
 assert.equal(topicForArticle({category:'Tin tài chính và đầu tư'}).slug,'tai-chinh-dau-tu');
 assert.equal(topicForArticle({category:'Môi trường và tiêu dùng bền vững'}).slug,'song-xanh-tai-su-dung');
 assert.equal(topicBySlug('not-real'),undefined);
});
test('search supports Vietnamese without accents and pagination remains bounded',()=>{
 const rows=Array.from({length:27},(_,i)=>({id:i,title:'Máy ảnh cho chuyến đi',excerpt:'Thuê thiết bị',tags:[],category:'Sản phẩm & thiết bị'}));
 assert.equal(filterNews(rows,{q:'may anh'}).total,27);
 assert.equal(filterNews(rows,{page:2}).rows[0].id,12);
 assert.equal(filterNews(rows,{page:999}).page,3);
 assert.equal(filterNews(rows,{page:-3}).page,1);
 assert.equal(filterNews(rows,{topic:topicBySlug('tai-chinh-ca-nhan')}).total,0);
});
