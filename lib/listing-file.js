import Papa from 'papaparse';
import { CATEGORIES, LISTING_CONDITIONS } from './constants.js';
import { buildEmptySpecs, getSpecFieldsForCategory, normalizeSpecs, validateSpecs } from './category-specs.js';

export const LISTING_FILE_LIMIT = 256 * 1024;
const VERSION = 'reloo-listing-v1';
const HEADERS = ['ma_truong', 'ten_truong', 'gia_tri', 'bat_buoc', 'goi_y'];
const BASIC = [
  ['title', 'Tên món đồ', true, 'Tên sản phẩm, model và phiên bản', 160],
  ['category', 'Danh mục', true, 'Mã hoặc tên danh mục RELOO', 100],
  ['condition', 'Tình trạng', true, Object.values(LISTING_CONDITIONS).map((item) => `${item.code}: ${item.label}`).join('; '), 100],
  ['description', 'Mô tả & điều kiện thuê', true, 'Mô tả thực tế và điều kiện giao nhận', 6000],
  ['dailyPrice', 'Giá thuê mỗi ngày', true, 'Số nguyên VND, ví dụ 180000', 20],
  ['marketValue', 'Giá trị tài sản', true, 'Số nguyên VND, ví dụ 3500000', 20],
  ['addressDetail', 'Chi tiết địa chỉ', false, 'Số nhà, đường hoặc tòa nhà', 500],
];

function categoryFor(value) { return CATEGORIES.find((item) => item.id === value || item.name === value); }
export function createListingCsv({ form = {}, specs = {}, addressDetail = '' }, template = false) {
  const category = categoryFor(form.category);
  if (!category) throw new Error('Vui lòng chọn danh mục trước khi tải file.');
  const fields = getSpecFieldsForCategory(category.id).fields;
  const rows = [['__format', 'Định dạng', VERSION, '', ''], ...BASIC.map(([id, label, required, hint]) => [
    id, label,
    id === 'category' ? category.id : id === 'addressDetail' ? template ? '' : addressDetail : template ? id === 'condition' ? 'good' : '' : form[id] ?? '',
    required ? 'Có' : 'Không', id === 'category' ? category.name : hint,
  ]), ...fields.map((field) => [`spec.${field.id}`, field.label, template ? '' : specs[field.id] ?? '', field.required ? 'Có' : 'Không', field.options?.join('; ') || field.placeholder || ''])];
  return '\uFEFF' + Papa.unparse({ fields: HEADERS, data: rows }, { newline: '\r\n', escapeFormulae: true });
}

export function parseListingCsv(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > LISTING_FILE_LIMIT) throw new Error('File CSV vượt giới hạn 256 KB.');
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t'] });
  if (parsed.errors.length || parsed.data.length > 80 || parsed.meta.fields?.length !== HEADERS.length || HEADERS.some((header) => !parsed.meta.fields.includes(header))) throw new Error('File CSV không đúng cấu trúc mẫu RELOO.');
  const values = new Map();
  for (const [index, row] of parsed.data.entries()) {
    const id = row.ma_truong?.trim();
    if (!id || values.has(id)) throw new Error(`Dòng ${index+2}: mã trường trống hoặc trùng lặp.`);
    values.set(id, String(row.gia_tri ?? '').trim());
  }
  if (values.get('__format') !== VERSION) throw new Error('Phiên bản file mẫu chưa được hỗ trợ.');
  const category = categoryFor(values.get('category'));
  if (!category) throw new Error('Danh mục trong file chưa hợp lệ.');
  const specFields = getSpecFieldsForCategory(category.id).fields;
  const allowed = new Set(['__format', ...BASIC.map(([id]) => id), ...specFields.map((field) => `spec.${field.id}`)]);
  for (const key of values.keys()) if (!allowed.has(key)) throw new Error(`Trường ${key} không thuộc mẫu của danh mục đã chọn.`);
  const form = { title: '', description: '', category: category.id, condition: 'good', dailyPrice: '', marketValue: '' };
  for (const [id, label, , , max] of BASIC) {
    const value = values.get(id) || '';
    if (value.length > max) throw new Error(`${label} vượt giới hạn ${max} ký tự.`);
    if (id in form && id !== 'category') form[id] = value;
  }
  const condition = Object.values(LISTING_CONDITIONS).find((item) => item.code === form.condition || item.label === form.condition);
  if (!condition) throw new Error('Tình trạng trong file chưa hợp lệ.');
  form.condition = condition.code;
  for (const [key, max] of [['dailyPrice', 100000000], ['marketValue', 1000000000]]) if (form[key] && (!/^\d+$/.test(form[key]) || !Number.isSafeInteger(Number(form[key])) || Number(form[key]) < 1 || Number(form[key]) > max)) throw new Error('Giá trong file phải là số nguyên VND trong giới hạn cho phép.');
  const specs = buildEmptySpecs(category.id);
  for (const field of specFields) specs[field.id] = values.get(`spec.${field.id}`) || '';
  const errors = validateSpecs(category.id, specs);
  for (const field of specFields) if (specs[field.id] && errors[field.id]) throw new Error(`${field.label}: ${errors[field.id]}`);
  const missing = [!form.title && 'Tên món đồ', !form.description && 'Mô tả', !form.dailyPrice && 'Giá thuê', !form.marketValue && 'Giá trị tài sản', ...specFields.filter((field) => field.required && !specs[field.id]).map((field) => field.label)].filter(Boolean);
  return { form, specs: { ...buildEmptySpecs(category.id), ...normalizeSpecs(category.id, specs) }, addressDetail: values.get('addressDetail') || '', categoryName: category.name, filled: [...values.entries()].filter(([key, value]) => key !== '__format' && value).length, missing };
}
