// Copies the on-device OCR engine (Tesseract) into public/ocr so the app serves it itself —
// no CDN needed, works on a closed network. Runs before every build / dev start.
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "ocr");
mkdirSync(out, { recursive: true });
const tjs = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(require.resolve("tesseract.js-core/package.json", { paths: [tjs] }));
const eng = dirname(require.resolve("@tesseract.js-data/eng/package.json"));
const files = [
  [join(tjs, "dist", "worker.min.js"), "worker.min.js"],
  [join(core, "tesseract-core-simd-lstm.wasm.js"), "tesseract-core-simd-lstm.wasm.js"],
  [join(core, "tesseract-core-lstm.wasm.js"), "tesseract-core-lstm.wasm.js"],
  [join(eng, "4.0.0_best_int", "eng.traineddata.gz"), "eng.traineddata.gz"],
];
for (const [src, name] of files) {
  const dst = join(out, name);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
}
console.log("OCR engine ready in public/ocr");
