import { HttpError } from "../server/http.js";
import { CATEGORIES } from "../constants.js";
import { normalizeSpecs, validateSpecs } from '../category-specs.js';
import { listingCommerce } from '../commerce.js';
import {normalizeRentalDetails} from '../listing-rental-details.js';
export function validateListing(input) {
  let commerce;try{commerce=listingCommerce(input);}catch(error){throw new HttpError(400,error.message,'COMMERCE_INVALID');}
  if (typeof input?.title !== "string" || input.title.trim().length < 3 || input.title.length > 160 || typeof input.description !== "string" || input.description.length > 6000 || !CATEGORIES.some((category) => category.id === input.category)) throw new HttpError(400, "Kiểm tra tên, mô tả và danh mục tin đăng.");
  if (!input.description.trim()) throw new HttpError(400, 'Vui lòng nhập mô tả và điều kiện thuê.');
  const specErrors = validateSpecs(input.category, input.specs);
  if (Object.keys(specErrors).length) throw new HttpError(400, `Thông số & phụ kiện: ${Object.values(specErrors)[0]}`, 'LISTING_SPECS_REQUIRED');
  let rentalDetails;try{rentalDetails=normalizeRentalDetails(input.rentalDetails,input.category);}catch{throw new HttpError(400,'Thông tin thuê, giao nhận hoặc phụ phí chưa hợp lệ.','RENTAL_DETAILS_INVALID');}
  if(commerce.transactionMode!=='SALE'&&rentalDetails?.pickupAvailable===false&&rentalDetails?.deliveryAvailable===false)throw new HttpError(400,'Chọn ít nhất một hình thức giao nhận.','HANDOVER_REQUIRED');
  const daily = commerce.transactionMode==='SALE'?0:Number(input.dailyPrice), value = Number(input.marketValue);
  if (!Number.isSafeInteger(daily) || (commerce.transactionMode!=='SALE'&&daily <= 0) || daily > 100000000 || !Number.isSafeInteger(value) || value <= 0 || value > 1000000000) throw new HttpError(400, "Giá thuê và giá trị tài sản chưa hợp lệ.");
  if (!Array.isArray(input.images) || !input.images.length || input.images.length > 10 || input.images.some((src) => typeof src !== "string" || src.length > 400000 || !/^(https:\/\/|data:image\/(jpeg|png|webp);base64,|\/)/.test(src))) throw new HttpError(400, "Tin đăng cần từ 1 đến 10 ảnh hợp lệ.");
  return { listing_data:{...commerce,rentalDetails},title: input.title.trim(), description: input.description.trim(), category: input.category, daily_price: daily, market_value: value, images: input.images, location: String(input.location || "").slice(0,300), location_details: input.locationDetails || {}, specs: normalizeSpecs(input.category,input.specs), condition: String(input.condition || "good").slice(0,30), status: ["available", "paused"].includes(input.status) ? input.status : "available" };
}
