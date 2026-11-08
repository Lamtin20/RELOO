# WebP image imports — 14 October 2026

New product image uploads are resized and exported to WebP in the browser. Unsupported browser decoding/encoding uses the authenticated `/api/images/optimize` endpoint. Listing create/update independently decode and check new images server-side before storing a WebP file and media record, returning a cached `/api/media/<id>` URL instead of inline base64. A valid already optimized WebP without metadata is kept unchanged to avoid another lossy encode.

The encoder bounds input pixels (50 million), output dimensions and bytes, applies orientation, preserves alpha and removes metadata on transcoding. New remote image imports use HTTPS, pinned public DNS addresses, bounded redirects/body/timeouts and the same decoder. Invalid images fail the import. Files/records created for a listing are rolled back when the listing save fails.

CRM uploads of banner/news/brand images already convert to WebP. Local Brand imports from `/images/` and new affiliate feed imports now store WebP copies through the same public media path. Newly processed Shorts posters are WebP; legacy JPEG poster URLs and stored old covers remain compatible. Existing references in edited listings are retained. This release does not rewrite historical images or private identity-document/provider formats.

For future project raster assets use `node scripts/import-web-image.mjs source.png public/images/name.webp`. It does not overwrite an existing file. Required browser icon formats, original design references and exports remain in their native format; renderable website content should reference the WebP derivative.

Banner cashback copy now explicitly states shopping happens at partners and cashback depends on each program. Desktop includes three steps. Mobile keeps the compact copy; the RELOOP note is a static, legible card with a heading and larger text.
