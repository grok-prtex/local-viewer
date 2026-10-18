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
    // AIGDT フォントの n は ⌀。公差の積み重ねは数字と離す（rt-net/crane_x7_Hardware の図面の書き方）
    expect(cleanMText('{8-\\fAIGDT|b0|i0;\\H4.5000;n\\fTahoma|b0|i0;\\H4.5000;2.5 貫通}')).toBe('8-⌀2.5 貫通');
    expect(cleanMText('{\\A1;\\fTahoma|b0|i0;\\H4.5;\\fAIGDT|b0|i0;\\H4.5;n\\fTahoma|b0|i0;\\H4.5;10\\S0.050^ 0; 貫通}')).toBe('⌀10 0.050/ 0 貫通');
    expect(cleanMText('{\\fgdt;j}{\\fArial;n}')).toBe('⌖n');
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
  it('実測値が -1（未計算）の寸法は図形から測り直し、R<> の記号を重ねない', () => {
    const dim = (pairs: [number, string | number][]) => ['0', 'DIMENSION', '8', 'dim', ...pairs.flatMap(([c, v]) => [String(c), String(v)])].join('\n');
    const src = ['0', 'SECTION', '2', 'ENTITIES',
      dim([[10, 0], [20, 10], [11, 21], [21, 10], [70, 32], [42, -1], [13, 0], [23, 0], [14, 42], [24, 0]]),
      dim([[10, 0], [20, 0], [11, 3], [21, 3], [70, 36], [1, 'R<>'], [42, -1], [15, 6], [25, 8]]),
      dim([[10, 0], [20, 0], [11, 3], [21, 3], [70, 35], [42, -1], [15, 20], [25, 0]]),
      '0', 'ENDSEC', '0', 'EOF'].join('\n');
    const s = strs(buildScene(parseDxf(src)));
    expect(s).toEqual(expect.arrayContaining(['42', 'R10', '⌀20']));
    expect(s.join('|')).not.toMatch(/-1|RR/);
  });
  it('Shift_JIS の古い DXF', () => {
    expect(strs(buildScene(load('dxf/sjis-r12.dxf')))).toContain('シフトJIS 古いDXF 図面');
  });
});

import { adjust, BG_RGB, lum, MIN_CONTRAST } from './color';
import * as THREE from 'three';
describe('DXF 色のコントラスト', () => {
  const cr = (a: THREE.Color, b: THREE.Color) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  it('黄(ACI 2)・シアン(4)など淡い色はライト背景で濃くなり、暗い青はダーク背景で明るくなる', () => {
    for (const rgb of [0xffff00, 0x00ffff, 0x00ff00, 0xff00ff, 0xff0000])
      expect(cr(adjust(rgb, 'light'), new THREE.Color(BG_RGB.light)), rgb.toString(16)).toBeGreaterThanOrEqual(MIN_CONTRAST - 0.01);
    expect(cr(adjust(0x0000ff, 'dark'), new THREE.Color(BG_RGB.dark))).toBeGreaterThanOrEqual(MIN_CONTRAST - 0.01);
    expect(adjust(0xffffff, 'light').getHex()).toBe(0x2a2e32);
  });
});
