// Constrained decoding is an additional guard. Always validate output again.
export function advisorSelectionSchema(products){
 const ids=[...new Set(products.map(p=>p.id))];
 return {type:'object',properties:{intent:{type:'string',enum:['rent','stays','jobs','sale','late','deposit','handoff','discover']},productIds:{type:'array',items:ids.length?{type:'string',enum:ids}:{type:'string'},maxItems:Math.min(3,ids.length)}},required:['intent','productIds'],additionalProperties:false};
}
// Small indexes avoid making a CPU model generate long UUIDs for every choice.
export function advisorIndexSchema(products){return {type:'object',additionalProperties:false,required:['intent','productIndexes'],properties:{intent:advisorSelectionSchema(products).properties.intent,productIndexes:{type:'array',maxItems:Math.min(3,products.length),items:products.length?{type:'integer',enum:products.map((_,i)=>i)}:{type:'integer'}}}};}
export function selectionFromIndexes(value,products){if(!value||!advisorSelectionSchema(products).properties.intent.enum.includes(value.intent)||!Array.isArray(value.productIndexes)||value.productIndexes.length>3||value.productIndexes.some(i=>!Number.isInteger(i)||i<0||i>=products.length))return null;return {intent:value.intent,productIds:[...new Set(value.productIndexes)].map(i=>products[i].id)};}
