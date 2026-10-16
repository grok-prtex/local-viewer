import { readFileSync } from 'fs';
import { parsePrc } from '../../src/prc/parse';
import { find3DStreams } from '../../src/pdf3d';
async function main() {
  for (const f of process.argv.slice(2)) {
    let b = new Uint8Array(readFileSync(f));
    const s = find3DStreams(b).find((x) => x.kind === 'PRC'); if (!s) continue;
    let d = b.subarray(s.start, s.end);
    if (/FlateDecode/.test(s.dict)) { const ds = new DecompressionStream('deflate'); d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(ds)).arrayBuffer()); }
    const p = await parsePrc(d);
    const st: Record<string, number> = {};
    for (const fs of p.fs) for (const t of fs.tess) { const c = t.id; if (c._t !== 'PRC_TYPE_TESS_3D_Compressed') continue;
      const T = c.triangle_face_array.length; const k = `recalc=${c.must_recalculate_normals} es=${c.edge_status_array.length === T ? 'T' : c.edge_status_array.length === 3 * T ? '3T' : '?'} refOK=${(c.reference_array_size - T) % 2 === 0} faces=${Math.max(...c.triangle_face_array) + 1 > 1 ? 'multi' : '1'}`;
      st[k] = (st[k] || 0) + 1; }
    console.log(f.split('/').pop(), 'minver', new DataView(d.buffer, d.byteOffset).getUint32(3, true), JSON.stringify(st));
  }
}
main();
