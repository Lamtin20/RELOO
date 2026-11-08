export function listingCommerce(input={}) {
 const mode=input.transactionMode || 'RENT';
 if(!['RENT','SALE','BOTH'].includes(mode))throw Error('Loại giao dịch chưa hợp lệ.');
 const salePrice=mode==='RENT'?null:Number(input.salePrice);
 if(mode!=='RENT'&&(!Number.isSafeInteger(salePrice)||salePrice<1||salePrice>1000000000))throw Error('Nhập giá bán hợp lệ từ 1 đến 1 tỷ đồng.');
 return {transactionMode:mode,salePrice};
}
export const canRent=listing=>listing?.transactionMode!=='SALE';
export const canBuy=listing=>['SALE','BOTH'].includes(listing?.transactionMode)&&Number(listing.salePrice)>0;
