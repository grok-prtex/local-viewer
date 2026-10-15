/* STEP / IGES をブラウザ内（WebAssembly）で読み込む Worker。ネットワーク通信は行いません。 */
self.importScripts('/vendor/occt/occt-import-js.js');
let ready = null;
function init() {
  if (!ready) ready = occtimportjs({ locateFile: (p) => '/vendor/occt/' + p });
  return ready;
}
self.onmessage = async (e) => {
  const { kind, buffer } = e.data;
  try {
    const occt = await init();
    self.postMessage({ type: 'progress', stage: '解析中' });
    const bytes = new Uint8Array(buffer);
    // 大きなファイルは三角形の細かさを少し粗くして、処理時間とメモリを抑えます
    const big = bytes.length > 5e6;
    const params = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: big ? 0.002 : 0.001, angularDeflection: big ? 0.6 : 0.5 };
    const r = kind === 'iges' ? occt.ReadIgesFile(bytes, params) : occt.ReadStepFile(bytes, params);
    if (!r.success) { self.postMessage({ type: 'done', ok: false, error: 'parse' }); return; }
    const meshes = r.meshes.map((m) => ({
      name: m.name || '',
      color: m.color || null,
      faceColors: m.brep_faces && m.brep_faces.some((f) => f.color) ? m.brep_faces.map((f) => ({ first: f.first, last: f.last, color: f.color })) : null,
      position: new Float32Array(m.attributes.position.array),
      normal: m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null,
      index: new Uint32Array(m.index.array),
    }));
    const transfer = [];
    meshes.forEach((m) => { transfer.push(m.position.buffer, m.index.buffer); if (m.normal) transfer.push(m.normal.buffer); });
    self.postMessage({ type: 'done', ok: true, meshes, root: r.root || null }, transfer);
  } catch (err) {
    self.postMessage({ type: 'done', ok: false, error: String(err) });
  }
};
