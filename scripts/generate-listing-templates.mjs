import { mkdir, writeFile } from 'node:fs/promises';
import { CATEGORIES } from '../lib/constants.js';
import { createListingCsv } from '../lib/listing-file.js';
const directory = new URL('../public/templates/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const category of CATEGORIES) await writeFile(new URL(`reloo-mau-${category.id}.csv`, directory), createListingCsv({ form: { category: category.id } }, true), 'utf8');
console.log(`Generated ${CATEGORIES.length} UTF-8 listing templates.`);
