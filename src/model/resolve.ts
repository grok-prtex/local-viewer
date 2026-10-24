/**
 * 3D モデルが参照する外部ファイル（.bin・テクスチャ・.mtl）を、一緒に選ばれたファイルから探して blob: URL に置き換えます。
 * 見つからないものは通信させず（サーバーへの問い合わせでファイル名が漏れないよう）、空の data: URL を返します。
 */
export const baseName = (p: string) => {
  let s = p; try { s = decodeURIComponent(p); } catch { /* そのまま */ }
  return s.replace(/\\/g, '/').split('/').pop()!.split('?')[0];
};

export function makeResolver(siblings: File[]) {
  const byName = new Map<string, File>();
  for (const f of siblings) byName.set(baseName(f.name).toLowerCase(), f);
  const urls = new Map<string, string>();
  const missing = new Set<string>(); const missingTex = new Set<string>();
  const find = (p: string) => byName.get(baseName(p).toLowerCase());
  const modify = (url: string) => {
    if (/^(blob|data):/i.test(url)) return url;
    const f = find(url);
    if (f) { let u = urls.get(f.name); if (!u) { u = URL.createObjectURL(f); urls.set(f.name, u); } return u; }
    const b = baseName(url);
    if (/\.(png|jpe?g|webp|gif|bmp|tga|ktx2|tiff?)$/i.test(b)) missingTex.add(b); else missing.add(b);
    return 'data:,';
  };
  return {
    find, modify, missing, missingTex,
    /** テクスチャの読み込み（非同期）が落ち着くまで少し待ちます */
    settle: () => new Promise<void>((r) => setTimeout(r, 0)),
    dispose: () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear(); },
  };
}
