import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { loadSlices, layerIndex, parsePart, parseTransform, apply, isClosed, polyArea } from './model/slice3mf';

const open = async (n: string) => {
  const zip = await JSZip.loadAsync(readFileSync(new URL('../tests/fixtures/slice/' + n, import.meta.url)));
  const files = new Map(Object.keys(zip.files).map((k) => ['/' + k.toLowerCase(), k]));
  return loadSlices(async (p) => { const k = files.get(p.toLowerCase()); return k ? zip.file(k)!.async('string') : null; });
};

describe('3MF スライス拡張', () => {
  it('sliceref で別パーツの層を読み、build item の変換を掛ける', async () => {
    const m = (await open('box_sliced.3mf'))!;
    expect(m.instances.length).toBe(1);
    const li = layerIndex(m);
    expect(li.zs.length).toBe(m.instances[0].slices.length);
    expect(li.zs.length).toBeGreaterThan(300);
    expect(li.zs[1]).toBeGreaterThan(li.zs[0]);
    expect(m.issues).toEqual([]);
  });
  it('メッシュが空の lowres オブジェクト・2 ファイルに分かれたスタック', async () => {
    const m = (await open('MultiSliceStack_TwoFiles.3mf'))!;
    expect(m.instances.length).toBeGreaterThanOrEqual(2);
    expect(m.instances.every((i) => i.lowres && i.slices.length > 0)).toBe(true);
  });
  it('build が空ならルートのスタックを並べる（開いた多角形も保持）', async () => {
    const m = (await open('Expected_Slice_Hierarchy.3mf'))!;
    expect(m.fallback).toBe(true);
    expect(m.instances.length).toBeGreaterThan(0);
    const s = m.instances.flatMap((i) => i.slices);
    expect(s.some((x) => x.polys.some((p) => !isClosed(p)))).toBe(true);
  });
  it('製造拡張の p:path で別パーツのオブジェクトをたどる', async () => {
    const m = (await open('2ProductionBoxes_OneSliceFile.3mf'))!;
    expect(m.instances.length).toBeGreaterThanOrEqual(1);
    expect(m.instances[0].m[12]).toBeCloseTo(30.099, 3);
  });
  it('仕様外の入れ子参照・存在しない参照でも落ちずに問題を記録する', async () => {
    const m = (await open('Slice_MustFail_TooRefsTooDeep.3mf'))!;
    expect(m.issues.map((i) => i.code)).toContain('nested-ref');
    expect(m.issues.length).toBeGreaterThan(0);
  });
  it('傾いた変換を検出する', async () => {
    const m = (await open('PS_505_02_non_planar_transform.3mf'))!;
    expect(m.issues.map((i) => i.code)).toContain('non-planar');
  });
  it('transform は行ベクトル規約で解釈する', () => {
    const t = parseTransform('1 0 0 0 1 0 0 0 1 10 20 30');
    expect(apply(t, 1, 2, 3)).toEqual([11, 22, 33]);
  });
  it('既定名前空間・小数で始まる ztop・面積の向き', () => {
    const p = parsePart(`<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><slicestack xmlns="http://schemas.microsoft.com/3dmanufacturing/slice/2015/07" id="1" zbottom="0"><slice ztop=".05"><vertices><vertex x="0" y="0"/><vertex x="1" y="0"/><vertex x="1" y="1"/></vertices><polygon startv="0"><segment v2="1"/><segment v2="2"/><segment v2="0"/></polygon></slice></slicestack></resources></model>`);
    const s = p.stacks.get('1')!.kids[0] as { slice: { ztop: number; xy: Float32Array; polys: Uint32Array[] } };
    expect(s.slice.ztop).toBe(0.05);
    expect(isClosed(s.slice.polys[0])).toBe(true);
    expect(polyArea(s.slice.xy, s.slice.polys[0])).toBeCloseTo(0.5);
  });
});
