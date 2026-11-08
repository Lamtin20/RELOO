export function normalizeListingQuery(value){return typeof value==='string'?value.normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim():'';}
export function matchesListingQuery(listing,query){
 const terms=normalizeListingQuery(query).split(' ').filter(Boolean);if(!terms.length)return true;
 const text=[listing?.title,listing?.description,listing?.location].map(normalizeListingQuery).join(' ');
 return terms.every(term=>text.includes(term));
}
