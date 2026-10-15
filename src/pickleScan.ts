/**
 * pickle / joblib を「実行せず」に眺めます。
 * REDUCE / BUILD / INST / OBJ はクラスを呼び出さないため、中身の復元はしません。
 * 文字列・数値・参照されている型名だけを集めます。
 */

export interface PickleScan {
  protocol: number | null;
  compression: 'なし' | 'zlib' | 'gzip' | '不明';
  globals: string[];
  strings: string[];
  numbers: number[];
  hasUnsafeOps: boolean;
  ops: number;
  note: string;
}

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u64 = (b: Uint8Array, i: number) => {
  // pickle の長さは通常小さいので、下位 32 bit だけ使います
  return u32(b, i);
};

function decodeUtf8(b: Uint8Array, start: number, len: number): string {
  try { return new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(start, start + len)); }
  catch { return ''; }
}

function lineStr(b: Uint8Array, i: number): [string, number] {
  let j = i; while (j < b.length && b[j] !== 0x0a) j++;
  return [decodeUtf8(b, i, j - i), j + 1];
}

/** zlib / gzip なら展開を試します（失敗しても元データを返します） */
export async function maybeInflate(input: Uint8Array): Promise<{ bytes: Uint8Array; compression: PickleScan['compression'] }> {
  if (input[0] === 0x1f && input[1] === 0x8b) {
    try {
      const ds = new DecompressionStream('gzip');
      const out = new Uint8Array(await new Response(new Blob([input as BlobPart]).stream().pipeThrough(ds)).arrayBuffer());
      return { bytes: out, compression: 'gzip' };
    } catch { return { bytes: input, compression: 'gzip' }; }
  }
  if (input[0] === 0x78 && (input[1] === 0x01 || input[1] === 0x5e || input[1] === 0x9c || input[1] === 0xda)) {
    try {
      const ds = new DecompressionStream('deflate');
      const out = new Uint8Array(await new Response(new Blob([input as BlobPart]).stream().pipeThrough(ds)).arrayBuffer());
      return { bytes: out, compression: 'zlib' };
    } catch { /* 次へ */ }
  }
  return { bytes: input, compression: input[0] === 0x80 ? 'なし' : '不明' };
}

export function looksPickle(head: Uint8Array): boolean {
  if (head[0] === 0x80 && head[1] <= 5) return true; // PROTO
  if (head[0] === 0x28 || head[0] === 0x5d || head[0] === 0x7d || head[0] === 0x2e) return true; // MARK / EMPTY_LIST / EMPTY_DICT / STOP（古い）
  if (head[0] === 0x78 && (head[1] === 0x01 || head[1] === 0x5e || head[1] === 0x9c || head[1] === 0xda)) return true;
  if (head[0] === 0x1f && head[1] === 0x8b) return true;
  return false;
}

/** オペコードをたどって安全な情報だけ集めます（コンストラクタは呼びません） */
export function scanPickle(bytes: Uint8Array, compression: PickleScan['compression'] = 'なし'): PickleScan {
  const globals = new Set<string>();
  const strings: string[] = [];
  const numbers: number[] = [];
  let protocol: number | null = null;
  let hasUnsafeOps = false;
  let ops = 0;
  let i = 0;
  const pushStr = (s: string) => { if (s && strings.length < 80 && !strings.includes(s)) strings.push(s.length > 120 ? s.slice(0, 117) + '…' : s); };
  const pushNum = (n: number) => { if (numbers.length < 40 && Number.isFinite(n)) numbers.push(n); };

  while (i < bytes.length) {
    const op = bytes[i++]; ops++;
    switch (op) {
      case 0x80: /* PROTO */ protocol = bytes[i++]; break;
      case 0x95: /* FRAME */ i += 8; break;
      case 0x94: /* MEMOIZE */ break;
      case 0x2e: /* STOP */ return finish();
      case 0x28: case 0x30: case 0x31: case 0x32: /* MARK POP POP_MARK DUP */ break;
      case 0x4e: /* NONE */ break;
      case 0x88: case 0x89: /* NEWTRUE NEWFALSE */ break;
      case 0x5d: case 0x7d: case 0x29: /* EMPTY_LIST EMPTY_DICT EMPTY_TUPLE */ break;
      case 0x61: case 0x65: case 0x73: case 0x75: case 0x6c: case 0x64: case 0x74: /* APPEND APPENDS SETITEM SETITEMS LIST DICT TUPLE */ break;
      case 0x4b: /* BININT1 */ pushNum(bytes[i++]); break;
      case 0x4d: /* BININT2 */ pushNum(u16(bytes, i)); i += 2; break;
      case 0x4a: /* BININT */ pushNum(u32(bytes, i) | 0); i += 4; break;
      case 0x8a: { /* LONG1 */ const n = bytes[i++]; i += n; break; }
      case 0x8b: { /* LONG4 */ const n = u32(bytes, i); i += 4 + n; break; }
      case 0x47: { /* BINFLOAT */ const dv = new DataView(bytes.buffer, bytes.byteOffset + i, 8); pushNum(dv.getFloat64(0, false)); i += 8; break; }
      case 0x8c: { /* SHORT_BINUNICODE */ const n = bytes[i++]; pushStr(decodeUtf8(bytes, i, n)); i += n; break; }
      case 0x58: { /* BINUNICODE */ const n = u32(bytes, i); i += 4; pushStr(decodeUtf8(bytes, i, n)); i += n; break; }
      case 0x8d: { /* BINUNICODE8 */ const n = u64(bytes, i); i += 8; pushStr(decodeUtf8(bytes, i, n)); i += n; break; }
      case 0x55: { /* SHORT_BINSTRING */ const n = bytes[i++]; pushStr(decodeUtf8(bytes, i, n)); i += n; break; }
      case 0x54: { /* BINSTRING */ const n = u32(bytes, i); i += 4; pushStr(decodeUtf8(bytes, i, n)); i += n; break; }
      case 0x43: { /* SHORT_BINBYTES */ const n = bytes[i++]; i += n; break; }
      case 0x42: { /* BINBYTES */ const n = u32(bytes, i); i += 4 + n; break; }
      case 0x8e: { /* SHORT_BINBYTES? BINBYTES8 */ const n = u64(bytes, i); i += 8 + n; break; }
      case 0x63: { /* GLOBAL */ const [m, i2] = lineStr(bytes, i); const [c, i3] = lineStr(bytes, i2); globals.add(m + '.' + c); i = i3; break; }
      case 0x93: { /* STACK_GLOBAL — 直前の 2 文字列が module / name。ここでは型名が文字列側に出ます */ hasUnsafeOps = true; break; }
      case 0x52: case 0x62: case 0x69: case 0x6f: /* REDUCE BUILD INST OBJ */ hasUnsafeOps = true; break;
      case 0x71: /* BINPUT */ i += 1; break;
      case 0x72: /* LONG_BINPUT */ i += 4; break;
      case 0x68: /* BINGET */ i += 1; break;
      case 0x6a: /* LONG_BINGET */ i += 4; break;
      case 0x81: /* NEWOBJ */ hasUnsafeOps = true; break;
      case 0x82: /* DUP; NEWOBJ_EX */ hasUnsafeOps = true; break;
      case 0x83: /* NEXT_BUFFER */ break;
      case 0x84: /* READONLY_BUFFER */ break;
      case 0x85: case 0x86: case 0x87: /* TUPLE1 TUPLE2 TUPLE3 */ break;
      case 0x90: case 0x91: case 0x92: /* ADDITEMS / FROZENSET / ... */ break;
      case 0x96: /* BYTEARRAY8 */ { const n = u64(bytes, i); i += 8 + n; break; }
      case 0x98: /* BYTEARRAY8? */ break;
      default:
        // 未知のオペコードはそこで止め、読めた範囲だけ返します
        return finish(`未知のオペコード 0x${op.toString(16)}（位置 ${i - 1}）で読み取りを止めました。`);
    }
    if (ops > 200000) return finish('オペコードが多すぎるため、途中までを表示しています。');
  }
  return finish('STOP に達する前にデータが終わりました。');

  function finish(extra = ''): PickleScan {
    // STACK_GLOBAL 用：連続する短い文字列のペアを型名候補にします（実行はしません）
    for (let k = 0; k + 1 < strings.length; k++) {
      const a = strings[k], b = strings[k + 1];
      if (/^[a-zA-Z_][\w.]*$/.test(a) && /^[A-Za-z_][\w]*$/.test(b) && a.includes('.')) globals.add(a + '.' + b);
      if (/^[a-zA-Z_][\w.]*$/.test(a) && /^[A-Za-z_][\w]*$/.test(b) && !a.includes(' ') && (a.startsWith('numpy') || a.startsWith('sklearn') || a.startsWith('joblib') || a.startsWith('collections') || a.startsWith('builtins'))) globals.add(a + '.' + b);
    }
    return {
      protocol, compression, globals: [...globals].sort(), strings: strings.slice(0, 60), numbers: numbers.slice(0, 30),
      hasUnsafeOps, ops,
      note: (hasUnsafeOps
        ? 'このファイルはクラスを復元する命令を含みます。ブラウザでは安全のため実行しません。'
        : '基本的な辞書・リスト・文字列だけの構造に見えます。それでも実行による復元はしません。') + (extra ? ' ' + extra : ''),
    };
  }
}
