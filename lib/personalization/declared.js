const KEY='reloo-declared-guest-v1';
export function readGuestInterests(storage,now=Date.now()){try{const row=JSON.parse(storage.getItem(KEY));return row?.version===1&&row.expires>now&&Array.isArray(row.categories)?row.categories.filter(x=>typeof x==='string'&&/^[a-z0-9-]{2,60}$/.test(x)).slice(0,5):[];}catch{return [];}}
export function saveGuestInterests(storage,categories,now=Date.now()){storage.setItem(KEY,JSON.stringify({version:1,categories:[...new Set(categories)].slice(0,5),expires:now+30*86400000}));}
export function clearGuestInterests(storage){storage.removeItem(KEY);}
