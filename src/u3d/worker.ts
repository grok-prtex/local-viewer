import { parseU3D } from './parse';
self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  try {
    const r = parseU3D(new Uint8Array(e.data));
    const transfer: ArrayBuffer[] = [];
    // 同じジオメトリが複数インスタンスで共有される場合があるため、コピーしてから転送します
    const meshes = r.meshes.map((m) => {
      const p = m.positions.slice(); const n = m.normals ? m.normals.slice() : null; const f = m.materialOfFace.slice();
      transfer.push(p.buffer, f.buffer); if (n) transfer.push(n.buffer);
      return { ...m, positions: p, normals: n, materialOfFace: f };
    });
    (self as unknown as Worker).postMessage({ ok: true, meshes, progressiveSkipped: r.progressiveSkipped }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) });
  }
};
