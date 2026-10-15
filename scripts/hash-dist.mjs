// dist/ 以下の全ファイルの SHA-256 を「ハッシュ  パス」形式で出力し、dist/build-manifest.sha256 に保存します。
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = new URL('../dist/', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const n of readdirSync(d).sort()) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
walk(root);
const lines = files.map((p) => relative(root, p)).filter((r) => r !== 'build-manifest.sha256').sort()
  .map((r) => `${createHash('sha256').update(readFileSync(join(root, r))).digest('hex')}  ${r}`);
const text = lines.join('\n') + '\n';
writeFileSync(join(root, 'build-manifest.sha256'), text);
const total = createHash('sha256').update(text).digest('hex');
console.log(text + `\nfiles: ${lines.length}\nmanifest sha256: ${total}`);
