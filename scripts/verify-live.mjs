// 公開サイトのファイルが、手元で作ったマニフェストと一致するかを確かめます。
// 使い方: node scripts/verify-live.mjs https://view.a-ef.com [dist/build-manifest.sha256]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const base = (process.argv[2] ?? 'https://view.a-ef.com').replace(/\/$/, '');
const manifest = readFileSync(process.argv[3] ?? new URL('../dist/build-manifest.sha256', import.meta.url), 'utf8');
// _headers は Cloudflare Pages の設定ファイルで、ファイルとしては配信されません（ヘッダーで確認します）
const entries = manifest.trim().split('\n').map((l) => l.split(/\s+/)).filter(([, p]) => p !== '_headers');
let ok = 0, bad = 0;
const queue = [...entries];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let e; (e = queue.shift());) {
    const [hash, p] = e;
    const r = await fetch(`${base}/${p.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'accept-encoding': 'identity' } });
    const h = createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
    if (r.ok && h === hash) ok++; else { bad++; console.log(`不一致: ${p} (HTTP ${r.status})`); }
  }
}));
const live = await (await fetch(`${base}/build-manifest.sha256`)).text();
console.log(`一致 ${ok} / 不一致 ${bad}　公開中のマニフェストと一致: ${live === manifest ? 'はい' : 'いいえ'}`);
const csp = (await fetch(base + '/')).headers.get('content-security-policy');
console.log('CSP: ' + csp);
process.exit(bad || live !== manifest ? 1 : 0);
