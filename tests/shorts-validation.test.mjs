import test from "node:test";
import assert from "node:assert/strict";
import {
  validateShort,
  validateVideoProbe,
  videoInputFormat,
  parseByteRange,
} from "../lib/shorts/validation.js";
import { mobileVerifierHash, mobileNext } from "../lib/mobile/validation.js";
test("video input rejects disguised playlists and recognises portrait camera rotation", () => {
  assert.equal(videoInputFormat(Buffer.from("0000000066747970", "hex")), "mov");
  assert.equal(
    videoInputFormat(Buffer.from("1a45dfa3", "hex")),
    "matroska",
  );
  assert.throws(() =>
    videoInputFormat(Buffer.from("#EXTM3U\nhttp://127.0.0.1/secret")),
  );
  assert.deepEqual(
    validateVideoProbe({
      format: { duration: "5" },
      streams: [
        {
          codec_type: "video",
          width: 1920,
          height: 1080,
          side_data_list: [{ rotation: 90 }],
        },
      ],
    }),
    { duration: 5, width: 1080, height: 1920 },
  );
  assert.throws(() =>
    validateVideoProbe({
      format: { duration: "181" },
      streams: [{ codec_type: "video", width: 720, height: 1280 }],
    }),
  );
  assert.throws(() =>
    validateVideoProbe({
      format: { duration: "5" },
      streams: [{ codec_type: "video", width: 1920, height: 1080 }],
    }),
  );
});
test("product tags accept owned-product IDs, allow ordinary clips and temporarily reject all manual external links", () => {
  const base = {
    mediaId: "00000000-0000-4000-8000-000000000001",
    caption: "Video đồ thuê",
    draft: false,
    products: [
      {
        kind: "RENTAL",
        assetId: "camera-owned",
      },
    ],
  };
  assert.equal(validateShort(base).products[0].assetId, "camera-owned");
  assert.throws(() =>
    validateShort({ ...base, products: [...base.products, ...base.products] }),
  );
  assert.throws(() =>
    validateShort({
      ...base,
      products: [
        {
          kind:'EXTERNAL',title:'Máy ảnh',
          href: "https://user:password@shopee.vn/product/1/2",
        },
      ],
    }),
  );
  assert.throws(() =>
    validateShort({
      ...base,
      products: [
        { kind:'EXTERNAL',title:'Máy ảnh', href: "https://shopee.vn.evil.invalid/x" },
      ],
    }),
  );
  assert.deepEqual(validateShort({...base,products:[]}).products,[]);
  assert.throws(()=>validateShort({...base,products:[{kind:'EXTERNAL',title:'Máy ảnh',href:'https://shopee.vn/product/1/2'}]}),/tạm ngừng/);
});
test("video byte ranges support seek/suffix and reject invalid or multiple ranges", () => {
  assert.deepEqual(parseByteRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-100", 1000), {
    start: 900,
    end: 999,
  });
  assert.deepEqual(parseByteRange("bytes=900-", 1000), {
    start: 900,
    end: 999,
  });
  assert.equal(parseByteRange("bytes=0-99,200-299", 1000), false);
  assert.equal(parseByteRange("bytes=1000-", 1000), false);
  assert.equal(parseByteRange("bytes=-0", 1000), false);
});
test("native verifier requires entropy-sized input and constrains return paths", () => {
  assert.equal(mobileVerifierHash("a".repeat(43)).length, 64);
  assert.throws(() => mobileVerifierHash("short"));
  assert.equal(mobileNext("https://evil.invalid"), "/");
  assert.equal(mobileNext("/api/private"), "/");
  assert.equal(mobileNext("/shorts"), "/shorts");
});
