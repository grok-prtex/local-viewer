import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeDxf, parseDxf, cleanMText, cleanText } from './parse';
import { buildScene, hasPaperSpace } from './scene';

const load = (f: string) => parseDxf(decodeDxf(new Uint8Array(readFileSync(`tests/fixtures/${f}`))));
const strs = (sc: ReturnType<typeof buildScene>) => sc.texts.map((t) => t.s);

describe('DXF 文字・寸法', () => {
  it('MTEXT の書式コードを除去する', () => {
    expect(cleanMText('{\\fMS Gothic|b1;注記}\\P1. \\U+2300 10 \\S+0.1^-0.0; \\C1;赤')).toBe('注記\n1. ⌀ 10 +0.1/-0.0 赤');
    expect(cleanText('%%c30 %%p0.1 45%%d')).toBe('⌀30 ±0.1 45°');
    expect(cleanMText('A\\~B \\\\ \\{x\\}')).toBe('A\u00a0B \\ {x}');
  });
  it('図枠ブロックの属性・TEXT・MTEXT・寸法・引出線を出す', () => {
    const d = load('dxf/jp-titleblock.dxf');
    const s = strs(buildScene(d, 'model'));
    for (const w of ['図番', '名称', 'LV-2026-001', 'ベースプレート 組立図', '中央 CENTER', '回転90°', '⌀30 ±0.1 45°', 'リーダー注記', 'MLEADER 引出し', '120', '60', 'R15'])
      expect(s.some((x) => x.includes(w)), w).toBe(true);
    expect(s).toEqual(expect.arrayContaining(['120', '60', 'R15']));
    expect(s).not.toContain('DWGNO');
    expect(s.join('|')).not.toContain('PS-01');
    expect(hasPaperSpace(d)).toBe(true);
    const ps = strs(buildScene(d, 'paper'));
    expect(ps).toContain('PS-01'); expect(ps).toContain('レイアウト1 ペーパー空間'); expect(ps).toContain('LV-2026-001');
  });
  it('匿名ブロックが無い寸法は自前で描く', () => {
    const sc = buildScene(load('dxf/dim-noblock.dxf'));
    expect(strs(sc)).toEqual(expect.arrayContaining(['100', '50']));
    expect(sc.segs.length).toBeGreaterThan(6);
  });
  it('Shift_JIS の古い DXF', () => {
    expect(strs(buildScene(load('dxf/sjis-r12.dxf')))).toContain('シフトJIS 古いDXF 図面');
  });
});
