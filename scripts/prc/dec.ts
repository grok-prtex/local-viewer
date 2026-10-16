import { readFileSync } from 'fs';
import { parsePrc } from '../../src/prc/parse';
import { find3DStreams } from '../../src/pdf3d';
import { decodeTess3DCompressed } from '../../src/prc/tess3dc';
function weld(p: Float32Array) { const m = new Map<string, number>(); const I: number[] = []; for (let i = 0; i < p.length; i += 3) { const k = `${p[i].toFixed(4)},${p[i+1].toFixed(4)},${p[i+2].toFixed(4)}`; let v = m.get(k); if (v === undefined) { v = m.size; m.set(k, v); } I.push(v); } return I; }
async function main() {
  for (const f of process.argv.slice(2)) {
    let b = new Uint8Array(readFileSync(f));
    const s = find3DStreams(b).find((x) => x.kind === 'PRC'); if (!s) continue;
    let d = b.subarray(s.start, s.end);
    if (/FlateDecode/.test(s.dict)) { const ds = new DecompressionStream('deflate'); d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(ds)).arrayBuffer()); }
    const p = await parsePrc(d);
    let okN = 0, bad = 0; const notes: string[] = []; let cerr = 0; const man: number[] = [];
    for (const fs of p.fs) for (const t of fs.tess) { const c = t.id; if (c._t !== 'PRC_TYPE_TESS_3D_Compressed') continue;
      const m = decodeTess3DCompressed(c);
      if (m.ok) okN++; else { bad++; if (notes.length < 3) notes.push(m.note!); }
      { const cnt = new Map<number, number>(); const I = weld(m.positions); for (let i = 0; i < I.length; i += 3) for (let k = 0; k < 3; k++) { const a = I[i+k], b = I[i+(k+1)%3]; const key = Math.min(a,b)*67108864+Math.max(a,b); cnt.set(key, (cnt.get(key)||0)+1); } let good=0; cnt.forEach((v)=>{ if (v===2) good++; }); man.push(good/cnt.size); }
      // bbox centre vs origin
      let mn = [1e300,1e300,1e300], mx = [-1e300,-1e300,-1e300];
      for (let i = 0; i < m.positions.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], m.positions[i+k]); mx[k] = Math.max(mx[k], m.positions[i+k]); }
      const o = c.origin_array ?? [0,0,0]; const size = Math.max(mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]) || 1;
      const e = Math.max(...[0,1,2].map((k) => Math.abs((mn[k]+mx[k])/2 - o[k]))) / size; if (e > 0.01) { cerr++; if (process.env.V) console.log("  off", e.toFixed(3), "T", c.triangle_face_array.length, "C", (c.reference_array_size - c.triangle_face_array.length)/2, m.ok); }
    }
    console.log(f.split('/').pop(), 'ok', okN, 'bad', bad, 'centreOff', cerr, 'manifold', (man.reduce((a,b)=>a+b,0)/Math.max(1,man.length)).toFixed(3), notes.join(' | '));
  }
}
main();
