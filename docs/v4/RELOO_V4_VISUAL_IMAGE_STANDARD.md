# V4 visual image standard

Status: EXISTING_PIPELINE_VERIFIED_BY_SOURCE / RENDERING_IMPROVEMENTS_IMPLEMENTED / PROVENANCE_INCOMPLETE.

Verified: `lib/images/webp.js` uses sharp, pixel/input bounds, orientation handling, bounded dimensions/bytes and metadata-free WebP output; `lib/images/listing-media.js` performs owner checks and cleanup on failed persistence. `ListingImage` handles candidate recovery. New work adds async decoding, dimension hints, guarded IntersectionObserver, stale-event-resistant error progression and localized fallback labels. No new raster image is added to website content.

Required content: genuine product photos show condition, defects, accessories and configuration. Provider/host photos must represent actual accommodation/service. No generated product/property/customer/transaction evidence. No automatic enhancement that removes damage or materially changes appearance. Illustration use requires appropriate context and rights. Existing hero/mascot/product assets retain their present hashes; an existing file or owner attestation alone does not establish third-party license.

Responsive rendering: use existing WebP media paths and intrinsic size/aspect hints. Do not invent thumbnail URLs or claim srcset derivatives exist where none are provisioned. Current shared renderer accepts size hints; complete per-width derivative/CDN rollout remains PROPOSED. Reserve layout space with correct container ratios; non-destructive contain/fit where condition evidence matters. Noncritical images lazy-load; critical image eagerness must be chosen per measured placement, not globally.

Original retention: existing normalization does not constitute an encrypted original-evidence archive. Whether originals are necessary, access rights, retention and deletion periods require business/privacy/legal confirmation before implementation. Do not silently retain all raw uploads or introduce a second public JPEG/PNG store. Proposed design is restricted encrypted evidence storage only where approved, with WebP public derivatives and deletion controls; this is not implemented or approved.

Moderation: existing upload validation is not a complete content/ownership moderation service. Abuse reporting, human escalation, partner ownership, moderation staffing and false-positive correction need accountable decisions. `compliance/asset-provenance.json` remains INCOMPLETE; legal/asset review is BLOCKED. QA must include broken images, cached images, orientation, transparency, alt text, visual condition fidelity and supported viewport/network conditions.
