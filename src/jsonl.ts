/** JSON Lines（.jsonl / .ndjson）の 1 行 1 件の整形と、JSONC（コメント・末尾のカンマ付き JSON）の読み込み */

/**
 * JSONC のコメント（// と /* *\/）と、} や ] の直前の余分なカンマを取り除きます。
 * 文字列の中身（"http://…" や "a,]" など）には触れません。改行は残すので行の対応はおおむね保たれます。
 */
export function stripJsonc(src: string): string {
  const out: string[] = [];
  const n = src.length; let i = 0; let from = 0;
  let comma = -1; // 出力中の、まだ確定していないカンマの位置（out の添字）
  const flush = (to: number) => { if (to > from) out.push(src.slice(from, to)); };
  while (i < n) {
    const c = src.charCodeAt(i);
    if (c === 34 /* " */) {
      let j = i + 1;
      while (j < n) { const d = src.charCodeAt(j); if (d === 92) j += 2; else if (d === 34) break; else j++; }
      comma = -1; i = Math.min(j + 1, n); continue;
    }
    if (c === 47 /* / */ && src.charCodeAt(i + 1) === 47) {
      flush(i); let j = i + 2; while (j < n && src.charCodeAt(j) !== 10) j++;
      i = j; from = j; continue;
    }
    if (c === 47 && src.charCodeAt(i + 1) === 42 /* * */) {
      flush(i); const e = src.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2;
      const nl = src.slice(i, j).replace(/[^\n]/g, ''); out.push(nl || ' ');
      i = j; from = j; continue;
    }
    if (c === 44 /* , */) { flush(i); comma = out.length; out.push(','); i++; from = i; continue; }
    if (c === 125 /* } */ || c === 93 /* ] */) { if (comma >= 0) { flush(i); out[comma] = ''; from = i; } comma = -1; i++; continue; }
    if (c !== 32 && c !== 9 && c !== 10 && c !== 13) comma = -1;
    i++;
  }
  flush(n);
  return out.join('');
}

/** 厳密な JSON として読み、だめならコメント・末尾のカンマを除いて読み直します */
export function parseJsonLoose(src: string): { value: unknown; loose: boolean } {
  const s = src.replace(/^\uFEFF/, '');
  try { return { value: JSON.parse(s), loose: false }; } catch (e) {
    let v: unknown;
    try { v = JSON.parse(stripJsonc(s)); } catch { throw e; }
    return { value: v, loose: true };
  }
}

export interface JsonlRecord {
  /** 元のファイルでの行番号（1 始まり） */
  line: number;
  /** 2 字下げで整形した JSON（読めなかった行は undefined） */
  pretty?: string;
  /** 読めなかった行の元の文字列 */
  raw?: string;
  /** 読めなかった理由 */
  error?: string;
}

export interface JsonlResult {
  records: JsonlRecord[];
  /** 空行を除いた件数（整形しなかった分も含む全体） */
  total: number;
  /** 整形した件数が total より少ない（上限で打ち切り） */
  truncated: boolean;
  errors: number;
}

/**
 * 1 行ずつ JSON として読み、整形します。空行は飛ばします。
 * 大きなファイルで止まらないよう、整形は maxRecords 件・元の文字数 maxChars までで打ち切り、残りは件数だけ数えます。
 */
export function formatJsonl(text: string, maxRecords = 2000, maxChars = 2_000_000): JsonlResult {
  const records: JsonlRecord[] = [];
  let total = 0, errors = 0, used = 0, pos = 0, line = 0;
  const n = text.length;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;
  while (pos <= n) {
    let end = text.indexOf('\n', pos); if (end < 0) end = n;
    line++;
    let s = pos, e = end;
    if (e > s && text.charCodeAt(e - 1) === 13) e--;
    while (s < e && /\s/.test(text[s])) s++;
    if (s < e) {
      total++;
      if (records.length < maxRecords && used < maxChars) {
        const raw = text.slice(pos, end).replace(/\r$/, '');
        used += raw.length;
        try { records.push({ line, pretty: JSON.stringify(JSON.parse(raw), null, 2) }); }
        catch (err) { errors++; records.push({ line, raw, error: (err as Error).message }); }
      }
    }
    if (end >= n) break;
    pos = end + 1;
  }
  return { records, total, truncated: records.length < total, errors };
}
