// ライブラリの静的ファイル（WASM・CMap・標準フォント）を public/ にコピーします。
import { cpSync, mkdirSync } from 'node:fs';
const nm = new URL('../node_modules/', import.meta.url).pathname;
const pub = new URL('../public/', import.meta.url).pathname;
mkdirSync(pub + 'vendor/occt', { recursive: true });
for (const f of ['occt-import-js.js', 'occt-import-js.wasm', 'license.occt.txt', 'license.occt-import-js.txt'])
  cpSync(nm + 'occt-import-js/dist/' + f, pub + 'vendor/occt/' + f);
for (const d of ['cmaps', 'standard_fonts', 'wasm', 'iccs'])
  cpSync(nm + 'pdfjs-dist/' + d, pub + 'vendor/pdfjs/' + d, { recursive: true });
console.log('assets copied');
