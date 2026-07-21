/**
 * Kiểm tra kết nối Polygon API — đọc key từ .env.local
 * Chạy: node scripts/check-polygon-api.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const apikey = process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
if (!apikey) {
  console.error('❌ Thiếu POLYGONSCAN_API_KEY trong .env.local');
  process.exit(1);
}

const url = new URL('https://api.etherscan.io/v2/api');
url.searchParams.set('chainid', '137');
url.searchParams.set('module', 'proxy');
url.searchParams.set('action', 'eth_blockNumber');
url.searchParams.set('apikey', apikey);

const res = await fetch(url);
const data = await res.json();

if (data.result && /^0x/i.test(data.result)) {
  const block = parseInt(data.result, 16);
  console.log('✅ Polygon API OK — chain 137');
  console.log(`   Block mới nhất: ${block.toLocaleString('en-US')}`);
  process.exit(0);
}

console.error('❌ Polygon API lỗi:', data.message || data.result || data);
process.exit(1);
