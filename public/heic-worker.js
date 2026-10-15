/* HEIC / HEIF をブラウザ内（libheif, LGPL-3.0, WebAssembly）で復号する Worker。通信は行いません。 */
self.importScripts('/vendor/libheif/libheif.js');
let lib = null;
self.onmessage = async (e) => {
  try {
    if (!lib) lib = await libheif({ locateFile: (p) => '/vendor/libheif/' + p });
    const images = new lib.HeifDecoder().decode(new Uint8Array(e.data));
    if (!images || !images.length) throw new Error('no image');
    const out = [];
    for (const im of images.slice(0, 20)) {
      const w = im.get_width(), h = im.get_height();
      const data = await new Promise((res, rej) => im.display({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }, (d) => d ? res(d) : rej(new Error('display'))));
      out.push({ width: w, height: h, data: data.data });
      im.free && im.free();
    }
    self.postMessage({ ok: true, images: out }, out.map((o) => o.data.buffer));
  } catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
