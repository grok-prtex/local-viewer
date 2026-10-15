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
    const bytes = new Uint8Array(buffer);
    const params = { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: 0.001, angularDeflection: 0.5 };
    const r = kind === 'iges' ? occt.ReadIgesFile(bytes, params) : occt.ReadStepFile(bytes, params);
    if (!r.success) { self.postMessage({ ok: false, error: 'parse' }); return; }
    const meshes = r.meshes.map((m) => ({
      name: m.name || '',
      color: m.color || null,
      position: new Float32Array(m.attributes.position.array),
      normal: m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null,
      index: new Uint32Array(m.index.array),
    }));
    const transfer = [];
    meshes.forEach((m) => { transfer.push(m.position.buffer, m.index.buffer); if (m.normal) transfer.push(m.normal.buffer); });
    self.postMessage({ ok: true, meshes }, transfer);
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
