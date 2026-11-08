import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
export function parseArticle(text){return unified().use(remarkParse).use(remarkGfm).parse(text||'');}
export function plainArticleText(node){return node.value||node.children?.map(plainArticleText).join('')||'';}
export function articleOutline(tree){
 const counts=new Map(),headings=[];
 for(const node of tree.children||[]){
  if(node.type!=='heading')continue;
  const text=plainArticleText(node);
  const base=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'phan';
  const count=(counts.get(base)||0)+1;counts.set(base,count);
  headings.push({node,text,id:count===1?base:base+'-'+count,depth:Math.max(2,Math.min(6,node.depth))});
 }
 return headings;
}
