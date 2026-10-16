import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from './en';
import { FORMATS } from './detect';
import { STAGES } from './progress';

const JA = /[\u3040-\u30ff\u4e00-\u9fff\uff01-\uff5e]/;
const files = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : []; });
const literalKeys = new Set<string>();
for (const f of files('src')) for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:t|tt)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) literalKeys.add(m[2].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\u0001/g, '\u0001'));
const dynamicKeys = [...STAGES, ...FORMATS.map((f) => f.label), 'なし', '不明', '自動', '原点', 'モデル中心', 'ダブルクリックした点'].filter((k) => JA.test(k));

describe('英語辞書', () => {
  it('コード中の t("…") のキーがすべて辞書にある', () => {
    expect([...literalKeys].filter((k) => JA.test(k) && !(k in EN))).toEqual([]);
  });
  it('動的に訳すキー（段階名・形式名など）も辞書にある', () => {
    expect(dynamicKeys.filter((k) => !(k in EN))).toEqual([]);
  });
  it('使われていないキーがない', () => {
    const used = new Set([...literalKeys, ...dynamicKeys]);
    expect(Object.keys(EN).filter((k) => !used.has(k))).toEqual([]);
  });
  it('英訳に日本語が残っていない・差し込み {n} が一致する', () => {
    for (const [k, v] of Object.entries(EN)) {
      expect(JA.test(v), `${k} → ${v}`).toBe(false);
      const ph = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join();
      expect(ph(v), k).toBe(ph(k));
    }
  });
});
