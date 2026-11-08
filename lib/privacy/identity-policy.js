export const IDENTITY_NOTICE_VERSION='RELOO_KYC_OCR_FINAL_V6';
export const DATA_COLLECTION_PATH='/cms/data-collection';
export const DATA_COLLECTION_VERSION='2026-10-22.1';
export function identityControllerReady(entity){return ['legalName','address','privacyEmail'].every(key=>typeof entity?.[key]==='string'&&entity[key].trim());}
