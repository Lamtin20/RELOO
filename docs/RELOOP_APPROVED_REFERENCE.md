# Approved RELOOP artwork — 14 October 2026

## Banner redesign and asset correction

The refreshed sprite collection is `approved-v3`. Action cells use a 120px horizontal stride; the previous 110px stride mixed adjacent characters in later columns. The expression labeled sleeping is now mapped to sleeping rather than confused. Explicit action requests select their corresponding artwork, including at banner sizes, instead of reverting to the same greeting master. These remain low-resolution reference crops; no invented high-resolution detail or articulated animation is claimed.

Rental banners show the flying pose in a warm outdoor scene, buy/sell shows the environmental pose with a circular reuse motif on dark teal, and affiliate promotions show the trophy celebration on peach. Headlines, explanatory text, category/condition chips, CTA and character speech are unique to each campaign. Mobile stacks the message above the scene; desktop uses a horizontal composition. No discount percentages or guaranteed cashback claims are fabricated.

The character reference supplied with the user's Character Lock v1.0 is preserved at `public/mascot/reloop/approved-v2/reference.png`. It was located in Downloads as `Hồ sơ linh vật RELOOP_ Người bảo hộ niềm tin.png`. Its checksum and extraction method are recorded in `approved-v2/provenance.json`.

The website uses artwork cropped directly from this reference. The face, head loops, leaf, blue AI modules, teal body, green gloves/boots, leaf cape and chest wordmark are preserved; no image generation or replacement character was used. Original assets remain available in `v1` for comparison.

`scripts/prepare-approved-reloop.mjs` produces the master, 16 expression crops and 20 action crops. `lib/mascot/artwork.ts` explicitly maps every existing emotion name and supported action crop. Related states share the closest available reference expression. Unsupported poses retain the emotion artwork instead of fabricating a new pose.

The supplied reference is a flattened 1536×1024 raster sheet. The master region is 400×485 pixels; expression cells are 86×98 and action cells 105×80. Exporting to a 640px canvas does not add detail. Above 160px, the component uses the main master to avoid enlarging tiny expression sprites. All assets retain the same square canvas to prevent layout shifts.

Motion uses the existing CSS transforms, status energy ring and warning/success indicators. It supports reduced motion and static banner artwork. It does not implement independent eyelid blinking, articulated 2–3 hand waves, face tracking, genuine walking cycles, or a Lottie/Rive/3D rig. Those require approved layers or animation files; no such files were supplied. Loading progress is displayed only when a finite measured value is provided.

Home banners use mint, pale blue and soft green surfaces with navy/green typography, green calls to action, the approved master, and restrained product cards. Desktop and mobile use one responsive composition. With reduced motion, carousel autoplay is disabled.
