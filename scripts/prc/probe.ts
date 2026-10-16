import { readFileSync } from 'fs';
import { parsePrc } from '../../src/prc/parse';
import { find3DStreams } from '../../src/pdf3d';
async function main() {
  for (const f of process.argv.slice(2)) {
    let b = new Uint8Array(readFileSync(f));
    if (f.endsWith('.pdf')) {
      const s = find3DStreams(b).find((x) => x.kind === 'PRC');
      if (!s) { console.log(f, 'no PRC'); continue; }
      let d = b.subarray(s.start, s.end);
      if (/FlateDecode/.test(s.dict)) { const ds = new DecompressionStream('deflate'); d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(ds)).arrayBuffer()); }
      b = d;
    }
    const t0 = Date.now();
    try {
      const p = await parsePrc(b);
      const types: Record<string, number> = {};
      for (const fs of p.fs) for (const t of fs.tess) { const k = t.id?._t ?? t._t; types[k] = (types[k] || 0) + 1; }
      console.log(f.split('/').pop(), 'v' + p.version, 'fs', p.fs.length, JSON.stringify(types), 'geom', p.hasGeometry.filter(Boolean).length, 'parts', p.fs.reduce((a, x) => a + (x.tree?.parts?.length || 0), 0), Date.now() - t0 + 'ms', p.warnings.slice(0, 3).join(' | '));
    } catch (e) { console.log(f, 'ERR', (e as Error).message); }
  }
}
main();
