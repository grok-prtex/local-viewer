// 本番で使う依存パッケージ（推移的依存を含む）のライセンス表記を public/licenses.txt にまとめます。
// node_modules だけを読むので、ネットワークは使いません。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tree = JSON.parse(execFileSync('npm', ['ls', '--omit=dev', '--all', '--json', '--long'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }));
const seen = new Map();
const walk = (deps) => {
  for (const [name, d] of Object.entries(deps ?? {})) {
    if (!d.path || seen.has(`${name}@${d.version}`)) continue;
    seen.set(`${name}@${d.version}`, { name, version: d.version, dir: d.path });
    walk(d.dependencies);
  }
};
walk(tree.dependencies);
const licText = (dir) => {
  const f = fs.readdirSync(dir).find((x) => /^(licen[cs]e|copying|notice)(\.|$|-)/i.test(x));
  return f ? fs.readFileSync(path.join(dir, f), 'utf8').trim() : '';
};
const out = [];
out.push('なんでもローカルビューア — ライセンス表記 / Third-party licenses', '='.repeat(64), '');
out.push('本体 / This app: MIT License', fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').trim(), '');
out.push('-'.repeat(64), fs.readFileSync(path.join(root, 'NOTICE'), 'utf8').trim(), '');
const vendor = [
  ['libheif (public/vendor/libheif)', 'public/vendor/libheif/LICENSE'],
];
for (const f of fs.readdirSync(path.join(root, 'public/vendor/pdfjs/wasm')).filter((x) => /^LICENSE/.test(x))) vendor.push([`pdf.js wasm: ${f.replace(/^LICENSE_?/, '')}`, `public/vendor/pdfjs/wasm/${f}`]);
for (const [label, p] of vendor) if (fs.existsSync(path.join(root, p))) out.push('-'.repeat(64), label, '', fs.readFileSync(path.join(root, p), 'utf8').trim(), '');
const list = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
for (const p of list) {
  const pj = JSON.parse(fs.readFileSync(path.join(p.dir, 'package.json'), 'utf8'));
  const lic = typeof pj.license === 'string' ? pj.license : pj.license?.type ?? (pj.licenses ?? []).map((l) => l.type).join(' OR ') ?? 'UNKNOWN';
  out.push('-'.repeat(64), `${p.name}@${p.version} — ${lic || 'UNKNOWN'}`, pj.homepage ? pj.homepage : '', '', licText(p.dir) || `(License: ${lic}. No license file is included in the package.)`, '');
}
fs.writeFileSync(path.join(root, 'public/licenses.txt'), out.join('\n') + '\n');
console.log(`licenses.txt: ${list.length} packages`);
