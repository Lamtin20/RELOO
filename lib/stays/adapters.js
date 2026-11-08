// Explicit capabilities. These objects must never fabricate production success.
export const unavailableRoomSource=Object.freeze({
 id:'unconfigured',capabilities:{catalog:false,availability:false,hold:false},
 async catalog(){return {available:false,reason:'SOURCE_NOT_CONFIGURED',stays:[]}},
 async hold(){throw Error('BOOKING_UNAVAILABLE')}
});
export const unavailableStayPayment=Object.freeze({
 id:'unconfigured',async create(){throw Error('PAYMENT_UNAVAILABLE')},async verifyWebhook(){throw Error('PAYMENT_UNAVAILABLE')}
});
export const unavailableStayMap=Object.freeze({id:'unconfigured',async locate(){return {available:false,coordinates:null}}});
export const queuedStayNotifications=Object.freeze({id:'sql-outbox',deliveryEnabled:false});
