import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { expandTess3D, locationMatrix, buildPrcScene } from './scene';
import { find3DStreams } from '../pdf3d';
import { B, R } from './bits';

describe('PRC TESS_3D', () => {
  it('expands triangles, fans and strips with per-vertex normals', () => {
    const P = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const c = {
      tessellation_coordinates: { coordinates: P }, normal_coordinates: [0, 0, 1],
      // 三角形 1 つ ＋ 4 点の扇（三角形 2 つ）
      triangulated_index_array: [0, 0, 0, 3, 0, 6, 0, 0, 0, 3, 0, 6, 0, 9],
      face_tessellation_data: [{ start_triangulated: 0, triangulateddata: [1, 1, 4], used_entities_flag: 0x2 | 0x4, number_of_textured_coordinate_indices: 0 }],
    };
    const m = expandTess3D(c);
    expect(m.positions.length).toBe(3 * 9);
    expect(Array.from(m.positions.subarray(18, 27))).toEqual([0, 0, 0, 1, 1, 0, 0, 1, 0]);
    expect(Array.from(m.normals!.subarray(0, 3))).toEqual([0, 0, 1]);
  });
  it('builds placement matrices', () => {
    expect(locationMatrix({ transform: { behavior: 1, translation: { x: 1, y: 2, z: 3 } } }).slice(12, 15)).toEqual([1, 2, 3]);
    const g = Array.from({ length: 16 }, (_, i) => i);
    expect(locationMatrix({ general_transform: g })).toEqual(g);
    // 回転（X=(0,1,0), Y=(-1,0,0)）と一様拡大 2
    const m = locationMatrix({ transform: { behavior: 2 | 8, rotation: [{ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }], scale: 2 } });
    expect(m.slice(0, 3)).toEqual([0, 2, 0]);
    expect(m.slice(4, 7)).toEqual([-2, 0, 0]);
    expect(m.slice(8, 11).map((x) => x + 0)).toEqual([0, 0, 2]);
  });
});

describe('PRC bit reader', () => {
  it('reads the terminating 0 bit after a 4-byte UnsignedInteger', () => {
    // 1 + 8 ビット × 4（0x40000000）＋終端 0、続けて 1 + 0x05 + 終端 0
    const bits = '1' + '00000000' + '1' + '00000000' + '1' + '00000000' + '1' + '01000000' + '0' + '1' + '00000101' + '0';
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i++) if (bits[i] === '1') bytes[i >> 3] |= 0x80 >> (i & 7);
    const r = new R(bytes);
    expect(B.UnsignedInteger(r)).toBe(0x40000000);
    expect(B.UnsignedInteger(r)).toBe(5);
  });
});

// 受け入れ用の公開サンプル（リポジトリには含めない）があれば、復号の検証も行う
const SAMPLE = '../acceptance/files/prc-outlet.pdf';
describe.skipIf(!existsSync(SAMPLE))('PRC sample', () => {
  it('decodes every compressed mesh with exact data consumption', async () => {
    let b = new Uint8Array(readFileSync(SAMPLE));
    const s = find3DStreams(b).find((x) => x.kind === 'PRC')!;
    let d = b.subarray(s.start, s.end);
    if (/FlateDecode/.test(s.dict)) d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    const sc = await buildPrcScene(d);
    expect(sc.stats.meshes).toBeGreaterThan(0);
    expect(sc.stats.verified).toBe(sc.stats.meshes);
    expect(sc.tree).not.toBeNull();
  });
});
