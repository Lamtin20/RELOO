import {parseArticle,articleOutline} from '@/lib/content/article-outline';
function safeLink(url){return /^(https?:\/\/|\/[^/]|#)/i.test(url||'')?url:'#';}
export function ArticleBody({text}){
 const tree=parseArticle(text),headings=articleOutline(tree),ids=new Map(headings.map(h=>[h.node,h.id]));
 function node(item,key){
  const children=item.children?.map((child,index)=>node(child,index));
  switch(item.type){
   case 'root':return <div className="article-body" key={key}>{children}</div>;
   case 'text':return item.value;
   case 'paragraph':{
    if(item.children?.length===1&&item.children[0].type==='image'){
     const image=item.children[0];return <figure key={key}><img src={safeLink(image.url)} alt={image.alt||''} loading="lazy" decoding="async"/>{image.alt&&<figcaption>{image.alt}</figcaption>}</figure>;
    }
    return <p key={key}>{children}</p>;
   }
   case 'heading':{const Tag=`h${Math.max(2,Math.min(6,item.depth))}`;return <Tag id={ids.get(item)} key={key}>{children}</Tag>;}
   case 'strong':return <strong key={key}>{children}</strong>;
   case 'emphasis':return <em key={key}>{children}</em>;
   case 'delete':return <del key={key}>{children}</del>;
   case 'list':{const Tag=item.ordered?'ol':'ul';return <Tag key={key}>{children}</Tag>;}
   case 'listItem':return <li key={key}>{children}</li>;
   case 'blockquote':return <blockquote key={key}>{children}</blockquote>;
   case 'link':return <a key={key} href={safeLink(item.url)}>{children}</a>;
   case 'image':return <img key={key} src={safeLink(item.url)} alt={item.alt||''} loading="lazy" decoding="async"/>;
   case 'code':return <pre key={key}><code>{item.value}</code></pre>;
   case 'inlineCode':return <code key={key}>{item.value}</code>;
   case 'break':return <br key={key}/>;
   case 'thematicBreak':return <hr key={key}/>;
   case 'table':return <div className="article-table" key={key}><table><tbody>{children}</tbody></table></div>;
   case 'tableRow':return <tr key={key}>{children}</tr>;
   case 'tableCell':return <td key={key}>{children}</td>;
   default:return null;
  }
 }
 return node(tree,0);
}
