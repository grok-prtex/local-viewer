/** CSV は UTF-8 を試し、だめなら Shift_JIS として読みます */
export function decodeCsv(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  // Excel の「Unicode テキスト」（タブ区切り）は UTF-16 で保存されます
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^\uFEFF/, ''); }
  catch { return new TextDecoder('shift_jis').decode(b); }
}

/**
 * タブ区切り（TSV）を行に分けます。引用符で囲んだ値（中に改行やタブを含む）がなければ、
 * 行の文字列だけを持っておき、表示する行だけを都度タブで分けます（大きな TSV でもメモリを節約）。
 * 引用符があるときは null を返します（表計算と同じ読み方に任せます）。
 */
export function splitTsv(text: string): { lines: string[]; ncols: number } | null {
  if (/(^|\t)"/m.test(text)) return null;
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  let ncols = 0;
  for (const l of lines) { let n = 1; for (let i = l.indexOf('\t'); i >= 0; i = l.indexOf('\t', i + 1)) n++; if (n > ncols) ncols = n; }
  return { lines, ncols: lines.length ? ncols : 0 };
}
