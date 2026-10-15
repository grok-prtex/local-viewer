/** テキスト系ファイルの判定・文字コード推定・言語の対応表 */

/** 拡張子 → highlight.js の言語名（'' はハイライトなし） */
export const TEXT_LANG: Record<string, string> = {
  txt: '', log: '', text: '', out: '', ini: 'ini', cfg: 'ini', conf: 'ini', properties: 'ini', toml: 'ini', env: 'bash',
  md: 'markdown', markdown: 'markdown', json: 'json', jsonc: 'json', geojson: 'json', xml: 'xml', xsd: 'xml', svgz: 'xml', plist: 'xml', csproj: 'xml', vcxproj: 'xml',
  yaml: 'yaml', yml: 'yaml', html: 'xml', htm: 'xml', xhtml: 'xml',
  py: 'python', pyw: 'python', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', mts: 'typescript',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp', ino: 'cpp', cs: 'csharp', java: 'java', kt: 'kotlin', kts: 'kotlin',
  go: 'go', rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift', sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell', psm1: 'powershell', bat: 'dos', cmd: 'dos',
  sql: 'sql', vb: 'vbnet', vbs: 'vbscript', vba: 'vbscript', bas: 'vbscript', cls: 'vbscript', frm: 'vbscript', css: 'css', scss: 'scss', less: 'scss',
  lua: 'lua', r: 'r', m: 'matlab', st: 'iecst', scl: 'iecst', nc: 'gcode', gcode: 'gcode', ngc: 'gcode', tap: 'gcode', cnc: 'gcode',
  diff: 'diff', patch: 'diff', makefile: 'makefile', dockerfile: 'dockerfile', gitignore: 'bash', csv_txt: '',
};

export type TextMode = 'plain' | 'markdown' | 'json' | 'xml' | 'yaml' | 'html' | 'code';

export function textMode(ext: string): TextMode {
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'json' || ext === 'jsonc' || ext === 'geojson') return 'json';
  if (ext === 'html' || ext === 'htm' || ext === 'xhtml') return 'html';
  if (['xml', 'xsd', 'plist', 'csproj', 'vcxproj'].includes(ext)) return 'xml';
  if (ext === 'yaml' || ext === 'yml') return 'yaml';
  return TEXT_LANG[ext] ? 'code' : 'plain';
}

/** NUL を含まず、制御文字が少なければテキストとみなします（UTF-16 は BOM で判定） */
export function looksText(head: Uint8Array): boolean {
  if (head.length === 0) return false;
  if ((head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff)) return true;
  let bad = 0;
  for (const b of head) { if (b === 0) return false; if (b < 9 || (b > 13 && b < 32 && b !== 27)) bad++; }
  return bad / head.length < 0.02;
}

/** 文字コードを推定して文字列にします（UTF-8 / UTF-16 / Shift_JIS / EUC-JP） */
export function decodeText(b: Uint8Array): { text: string; encoding: string } {
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { text: new TextDecoder('utf-8').decode(b.subarray(3)), encoding: 'UTF-8（BOM 付き）' };
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(b.subarray(2)), encoding: 'UTF-16LE' };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(b.subarray(2)), encoding: 'UTF-16BE' };
  // BOM なし UTF-16 の目安：偶数／奇数バイトの片側に NUL が多い
  const n = Math.min(b.length, 4096); let ev = 0, od = 0;
  for (let i = 0; i < n; i++) if (b[i] === 0) (i % 2 ? od++ : ev++);
  if (od > n / 4 && ev < n / 50) return { text: new TextDecoder('utf-16le').decode(b), encoding: 'UTF-16LE' };
  if (ev > n / 4 && od < n / 50) return { text: new TextDecoder('utf-16be').decode(b), encoding: 'UTF-16BE' };
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'UTF-8' }; } catch { /* 次へ */ }
  const score = (t: string) => { let bad = 0; for (const ch of t) { const c = ch.charCodeAt(0); if (c === 0xfffd) bad += 10; else if (c >= 0xff61 && c <= 0xff9f) bad += 1; /* 半角カナが多すぎるのは誤判定の兆候 */ } return bad; };
  const sj = new TextDecoder('shift_jis').decode(b), eu = new TextDecoder('euc-jp').decode(b);
  return score(eu) < score(sj) ? { text: eu, encoding: 'EUC-JP' } : { text: sj, encoding: 'Shift_JIS' };
}
