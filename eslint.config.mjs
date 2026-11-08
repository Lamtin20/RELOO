import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "output/**",
    ".playwright-cli/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated native bundles and vendored Emscripten code are not React source.
    "mobile/android/**/build/**",
    "mobile/ios/**/build/**",
    "public/vision/wasm/**",
    // Unmodified BSD MapLibre worker; pinned-byte identity is checked by live-map tests.
    "public/maps/maplibre-worker-6.16.0.mjs",
    // MIT upstream geometry/pose code; pinned adaptation hashes checked separately.
    "lib/vendor/my-office/chibi-rig.js",
  ]),
]);

export default eslintConfig;
