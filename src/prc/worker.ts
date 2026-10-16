import { buildPrcScene } from './scene';
self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    let last = 0;
    const s = await buildPrcScene(new Uint8Array(e.data), (p, label) => { const now = Date.now(); if (now - last > 120) { last = now; (self as unknown as Worker).postMessage({ progress: p, label }); } });
    const transfer: ArrayBuffer[] = [];
    // 同じメッシュが複数の配置で共有されるため、コピーしてから転送します
    const meshes = s.meshes.map((m) => {
      const p = m.positions.slice(); const n = m.normals ? m.normals.slice() : null; const c = m.colorOfTriangle.slice();
      transfer.push(p.buffer, c.buffer); if (n) transfer.push(n.buffer);
      return { ...m, positions: p, normals: n, colorOfTriangle: c };
    });
    (self as unknown as Worker).postMessage({ ok: true, scene: { ...s, meshes } }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) });
  }
};
