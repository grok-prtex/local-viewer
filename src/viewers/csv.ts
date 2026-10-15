/** CSV は UTF-8 を試し、だめなら Shift_JIS として読みます */
export function decodeCsv(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^\uFEFF/, ''); }
  catch { return new TextDecoder('shift_jis').decode(b); }
}
