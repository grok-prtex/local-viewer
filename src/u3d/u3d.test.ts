import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseU3D } from './parse';
import { extract3D, find3DStreams } from '../pdf3d';
import { detectFormat } from '../detect';
const fx = (n: string) => new Uint8Array(readFileSync(new URL('../../tests/fixtures/' + n, import.meta.url)));

describe('U3D', () => {
  it('単体の U3D を読み、全頂点インデックスが範囲内', () => {
    const r = parseU3D(fx('sample.u3d'));
    expect(r.meshes.length).toBeGreaterThan(10);
    const faces = r.meshes.reduce((a, m) => a + m.positions.length / 9, 0);
    expect(faces).toBe(1820);
    expect(detectFormat('x.bin', fx('sample.u3d'))).toBe('u3d');
  });
  it('3D PDF から U3D を取り出して復号する', async () => {
    const m = await extract3D(fx('sample-3d-u3d.pdf'));
    expect(m?.kind).toBe('U3D');
    const r = parseU3D(m!.data);
    const faces = r.meshes.reduce((a, x) => a + x.positions.length / 9, 0);
    expect(faces).toBe(4716);
    for (const x of r.meshes) for (const v of x.positions) expect(Math.abs(v)).toBeLessThanOrEqual(4.0001);
  });
  it('PRC を検出する', async () => {
    expect(find3DStreams(fx('sample-3d-prc.pdf'))[0].kind).toBe('PRC');
    expect((await extract3D(fx('sample-3d-prc.pdf')))?.kind).toBe('PRC');
    expect(await extract3D(fx('sample.pdf'))).toBeNull();
  });
});
