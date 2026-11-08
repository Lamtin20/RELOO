import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../lib/constants.js';
import { getSpecFieldsForCategory, validateSpecs } from '../lib/category-specs.js';
import { createListingCsv, parseListingCsv } from '../lib/listing-file.js';
import { validateListing } from '../lib/db/listing-write.js';

const form = { title: 'Sony, "A7IV"', category: 'may-anh', condition: 'good', description: 'Máy ảnh thực tế\nNhận trả trực tiếp.', dailyPrice: '600000', marketValue: '45000000' };
const specs = { brand: 'Sony', model: 'A7IV', sensor: 'Full-frame 33MP', accessories: 'Pin, thẻ nhớ\nTúi đựng', usageCount: '0' };
test('CSV round trip preserves Vietnamese text, quotes, commas and multiline specs', () => {
  const csv = createListingCsv({ form, specs, addressDetail: '12 Nguyễn Văn A' });
  assert.equal(csv[0], '\uFEFF');
  const parsed = parseListingCsv(csv);
  assert.deepEqual(parsed.form, form);
  assert.deepEqual(parsed.specs, specs);
  assert.equal(parsed.addressDetail, '12 Nguyễn Văn A');
  assert.equal(parsed.missing.length, 0);
});
test('every category template includes its required specs and accessories', () => {
  for (const category of CATEGORIES) {
    const parsed = parseListingCsv(createListingCsv({ form: { category: category.id } }, true));
    assert.equal(parsed.form.category, category.id);
    assert.ok(parsed.missing.length > 0);
    assert.ok(getSpecFieldsForCategory(category.id).fields.some((field) => ['accessories','included'].includes(field.id) && field.required));
  }
});
test('unsafe spreadsheets, duplicate fields, wrong category specs and invalid prices are rejected', () => {
  const csv = createListingCsv({ form, specs });
  assert.throws(() => parseListingCsv(csv + '\r\ntitle,Duplicate,title,Có,test'), /trùng/);
  assert.throws(() => parseListingCsv(csv.replace('spec.sensor', 'spec.unexpected')), /không thuộc/);
  assert.throws(() => parseListingCsv(csv.replace('600000', '-200')), /số nguyên/);
  assert.throws(() => parseListingCsv('x'.repeat(256*1024+1)), /256 KB/);
  assert.ok(createListingCsv({ form: { ...form, title: '=HYPERLINK("https://example.test")' }, specs }).includes("'=HYPERLINK"));
});
test('listing API requires a valid category and complete category specs', () => {
  const listing = { ...form, specs, images: ['/images/fixtures/photo.jpg'] };
  assert.equal(validateListing(listing).specs.model, 'A7IV');
  assert.throws(() => validateListing({ ...listing, category: '' }), /danh mục/);
  assert.throws(() => validateListing({ ...listing, specs: {} }), (error) => error.code === 'LISTING_SPECS_REQUIRED');
  assert.throws(() => validateListing({ ...listing, specs: { ...specs, accessories: ' ' } }), (error) => error.code === 'LISTING_SPECS_REQUIRED');
  assert.ok(validateSpecs('may-anh', { ...specs, usageCount: {} }).usageCount);
});
