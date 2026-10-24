// ライブラリの静的ファイル（WASM・CMap・標準フォント）を public/ にコピーします。
import { cpSync, mkdirSync } from 'node:fs';
const nm = new URL('../node_modules/', import.meta.url).pathname;
const pub = new URL('../public/', import.meta.url).pathname;
mkdirSync(pub + 'vendor/occt', { recursive: true });
for (const f of ['occt-import-js.js', 'occt-import-js.wasm', 'license.occt.txt', 'license.occt-import-js.txt'])
  cpSync(nm + 'occt-import-js/dist/' + f, pub + 'vendor/occt/' + f);
for (const d of ['cmaps', 'standard_fonts', 'wasm', 'iccs'])
  cpSync(nm + 'pdfjs-dist/' + d, pub + 'vendor/pdfjs/' + d, { recursive: true });
mkdirSync(pub + 'vendor/libheif', { recursive: true });
for (const f of ['libheif.js', 'libheif.wasm', 'LICENSE']) cpSync(nm + 'libheif-js/libheif-wasm/' + f, pub + 'vendor/libheif/' + f);
mkdirSync(pub + 'vendor/exceljs', { recursive: true });
cpSync(nm + 'exceljs/dist/exceljs.bare.min.js', pub + 'vendor/exceljs/exceljs.bare.min.js');
mkdirSync(pub + 'vendor/sqljs', { recursive: true });
for (const f of ['sql-wasm.js', 'sql-wasm.wasm']) cpSync(nm + 'sql.js/dist/' + f, pub + 'vendor/sqljs/' + f);
// 7z を読む libarchive（ワーカー + WASM）
mkdirSync(pub + 'vendor/libarchive', { recursive: true });
for (const f of ['worker-bundle.js', 'libarchive.wasm']) cpSync(nm + 'libarchive.js/dist/' + f, pub + 'vendor/libarchive/' + f);
cpSync(nm + 'libarchive.js/LICENSE', pub + 'vendor/libarchive/LICENSE');
// glTF の Draco 圧縮を展開するデコーダー
mkdirSync(pub + 'vendor/draco', { recursive: true });
for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) cpSync(nm + 'three/examples/jsm/libs/draco/gltf/' + f, pub + 'vendor/draco/' + f);
console.log('assets copied');
