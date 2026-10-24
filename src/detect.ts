import { TEXT_LANG, looksText } from './text';
import { ftypBrand, imageSub, mediaKind } from './media';
export type FormatKind =
  | 'pdf' | 'eml' | 'msg' | 'stl' | 'step' | 'iges' | 'u3d' | 'dxf' | 'zip'
  | 'csv' | 'image' | 'video' | 'audio' | 'text' | 'sqlite' | 'access' | 'joblib' | 'ipynb'
  | 'model3d' | 'archive' | 'tsv' | 'parquet' | 'mbox' | 'font' | 'unknown';

export interface FormatInfo {
  kind: FormatKind;
  label: string;
  group: 'Office' | 'Mail' | 'CAD' | 'Image' | 'Media' | 'Archive' | 'Font' | 'Text' | 'Code';
  exts: string[];
  ready: boolean;
}

export const FORMATS: FormatInfo[] = [
  { kind: 'pdf', label: 'PDF（3D PDF 含む）', group: 'Office', exts: ['pdf'], ready: true },
  { kind: 'csv', label: 'CSV', group: 'Office', exts: ['csv'], ready: true },
  { kind: 'tsv', label: 'TSV', group: 'Office', exts: ['tsv', 'tab'], ready: true },
  { kind: 'parquet', label: 'Parquet', group: 'Office', exts: ['parquet'], ready: true },
  { kind: 'sqlite', label: 'SQLite', group: 'Office', exts: ['sqlite', 'sqlite3', 'db', 'db3'], ready: true },
  { kind: 'access', label: 'Access', group: 'Office', exts: ['mdb', 'accdb'], ready: true },
  { kind: 'joblib', label: 'joblib / pickle', group: 'Code', exts: ['joblib', 'pkl', 'pickle'], ready: true },
  { kind: 'eml', label: 'EML', group: 'Mail', exts: ['eml'], ready: true },
  { kind: 'msg', label: 'Outlook MSG', group: 'Mail', exts: ['msg'], ready: true },
  { kind: 'mbox', label: 'MBOX', group: 'Mail', exts: ['mbox', 'mbx'], ready: true },
  { kind: 'dxf', label: 'DXF', group: 'CAD', exts: ['dxf'], ready: true },
  { kind: 'step', label: 'STEP', group: 'CAD', exts: ['step', 'stp'], ready: true },
  { kind: 'iges', label: 'IGES', group: 'CAD', exts: ['iges', 'igs'], ready: true },
  { kind: 'stl', label: 'STL', group: 'CAD', exts: ['stl'], ready: true },
  { kind: 'u3d', label: 'U3D', group: 'CAD', exts: ['u3d'], ready: true },
  { kind: 'model3d', label: 'OBJ', group: 'CAD', exts: ['obj'], ready: true },
  { kind: 'model3d', label: '3MF', group: 'CAD', exts: ['3mf'], ready: true },
  { kind: 'model3d', label: 'glTF / GLB', group: 'CAD', exts: ['gltf', 'glb'], ready: true },
  { kind: 'model3d', label: 'PLY', group: 'CAD', exts: ['ply'], ready: true },
  { kind: 'text', label: 'テキスト・ログ・設定', group: 'Text', exts: ['txt', 'log', 'ini', 'cfg', 'conf', 'toml', 'env'], ready: true },
  { kind: 'text', label: 'Markdown', group: 'Text', exts: ['md'], ready: true },
  { kind: 'text', label: 'JSON / JSON Lines / XML / YAML', group: 'Text', exts: ['json', 'jsonl', 'ndjson', 'xml', 'yaml', 'yml'], ready: true },
  { kind: 'text', label: 'HTML', group: 'Text', exts: ['html', 'htm'], ready: true },
  { kind: 'text', label: 'PLC・NC（ST / SCL / G コード）', group: 'Code', exts: ['st', 'scl', 'nc', 'gcode', 'tap'], ready: true },
  { kind: 'ipynb', label: 'Jupyter ノートブック', group: 'Code', exts: ['ipynb'], ready: true },
  { kind: 'text', label: 'ソースコード', group: 'Code', exts: Object.keys(TEXT_LANG).filter((x) => !['txt', 'log', 'ini', 'cfg', 'conf', 'toml', 'env', 'md', 'json', 'xml', 'yaml', 'yml', 'html', 'htm', 'st', 'scl', 'nc', 'gcode', 'tap', 'csv_txt', 'text', 'out', 'markdown', 'jsonc', 'geojson', 'jsonl', 'ndjson', 'jsonlines', 'xsd', 'svgz', 'plist', 'csproj', 'vcxproj', 'xhtml', 'properties', 'ngc', 'cnc'].includes(x)), ready: true },
  { kind: 'image', label: '一般的な画像', group: 'Image', exts: ['png', 'jpg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico'], ready: true },
  { kind: 'image', label: 'HEIC / HEIF', group: 'Image', exts: ['heic', 'heif'], ready: true },
  { kind: 'image', label: 'TIFF', group: 'Image', exts: ['tif', 'tiff'], ready: true },
  { kind: 'image', label: 'Photoshop', group: 'Image', exts: ['psd'], ready: true },
  { kind: 'image', label: 'カメラ RAW（プレビュー）', group: 'Image', exts: ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2'], ready: true },
  { kind: 'image', label: 'TGA / JPEG XL', group: 'Image', exts: ['tga', 'jxl'], ready: true },
  { kind: 'video', label: '動画', group: 'Media', exts: ['mp4', 'mov', 'webm', 'mkv'], ready: true },
  { kind: 'audio', label: '音声', group: 'Media', exts: ['mp3', 'wav', 'm4a', 'ogg', 'flac'], ready: true },
  { kind: 'zip', label: 'ZIP', group: 'Archive', exts: ['zip'], ready: true },
  { kind: 'archive', label: '7z', group: 'Archive', exts: ['7z'], ready: true },
  { kind: 'archive', label: 'tar / gzip', group: 'Archive', exts: ['tar', 'gz', 'tgz'], ready: true },
  { kind: 'font', label: 'TrueType / OpenType', group: 'Font', exts: ['ttf', 'otf'], ready: true },
  { kind: 'font', label: 'WOFF / WOFF2', group: 'Font', exts: ['woff', 'woff2'], ready: true },
];

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

const OFFICE_DWG = new Set(['docx', 'docm', 'doc', 'dotx', 'xlsx', 'xlsm', 'xlsb', 'xls', 'xltx', 'ods', 'odt', 'odp', 'pptx', 'pptm', 'ppt', 'ppsx', 'dwg']);

function startsWith(b: Uint8Array, sig: number[]): boolean {
  return sig.every((v, i) => b[i] === v);
}

function ascii(b: Uint8Array, n = 512): string {
  let s = '';
  for (let i = 0; i < Math.min(n, b.length); i++) s += String.fromCharCode(b[i]);
  return s;
}

const LEGACY_VIDEO = new Set(['avi', 'wmv', 'asf', 'flv']);
/** RIFF-AVI・ASF（WMV）・FLV の先頭バイト。拡張子が違っても未対応として扱う（.wma は音声として従来どおり） */
function isLegacyVideo(ext: string, h: Uint8Array): boolean {
  const t = ascii(h, 12);
  if (t.startsWith('RIFF') && t.slice(8, 12) === 'AVI ') return true;
  if (t.startsWith('FLV') && h[3] === 1) return true;
  return ext !== 'wma' && startsWith(h, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]);
}

/**
 * ファイル名と先頭バイトから形式を判定します。
 * 中身のシグネチャを優先し、判別できない場合は拡張子で判定します。
 */
export function detectFormat(name: string, head: Uint8Array): FormatKind {
  const ext = extOf(name);
  const text = ascii(head);
  // AVI / WMV / FLV（ASF・FLV コンテナ）はブラウザで再生できず、同梱できる変換手段もないため非対応（2026-10-24 削除）。中身の判定より前に止める
  if (LEGACY_VIDEO.has(ext) || isLegacyVideo(ext, head)) return 'unknown';
  const brand = ftypBrand(head);
  if (brand) {
    if (imageSub(ext, head) === 'heic' || /^(avif|avis|crx )$/.test(brand)) return 'image';
    const mk = mediaKind(ext, head); if (mk) return mk;
  }
  if (ext === 'joblib' || ext === 'pkl' || ext === 'pickle') return 'joblib';
  if (ext === 'ipynb' && looksText(head)) return 'ipynb';
  if (ext === 'mdb' || ext === 'accdb' || ascii(head).startsWith('Standard Jet DB') || ascii(head).startsWith('Standard ACE DB')) return 'access';
  if (ascii(head).startsWith('SQLite format 3')) return 'sqlite';
  if (startsWith(head, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return 'archive'; // 7z
  if (startsWith(head, [0x1f, 0x8b]) && ext !== 'svgz') return 'archive'; // gzip（.tar.gz / .tgz / .gz）
  if (head.length >= 262 && ascii(head.subarray(257, 262)) === 'ustar') return 'archive'; // tar
  if (text.startsWith('PAR1')) return 'parquet';
  if (text.startsWith('glTF') && (head[4] === 2 || head[4] === 1)) return 'model3d'; // GLB
  if (/^ply\r?\n/.test(text)) return 'model3d';
  if (text.startsWith('wOFF') || text.startsWith('wOF2') || text.startsWith('OTTO') || ((ext === 'ttf' || ext === 'otf') && (startsWith(head, [0, 1, 0, 0]) || text.startsWith('true')))) return 'font';
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (/^\s*ISO-10303-21/.test(text)) return 'step';
  if (startsWith(head, [0x55, 0x33, 0x44, 0x00])) return 'u3d';
  // Office（Word / Excel / PowerPoint）と DWG は表示品質が基準に届かないため非対応（2026-10-24 削除）。ZIP・OLE・テキスト判定より前に止める
  if (OFFICE_DWG.has(ext)) return 'unknown';
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])) {
    // ZIP コンテナ
    if (ext === '3mf') return 'model3d';
    return 'zip';
  }
  // SolidWorks（sldprt / sldasm / slddrw）は非対応（2026-10-16 削除）。OLE 判定より前に止める
  if (ext === 'sldprt' || ext === 'sldasm' || ext === 'slddrw') return 'unknown';
  // Parasolid（x_t / x_b）はブラウザだけでは形状表示できないため非対応（2026-10-16 削除）
  if (ext === 'x_t' || ext === 'x_b' || ext === 'xmt_txt' || ext === 'xmt_bin') return 'unknown';
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // OLE2 複合ファイル（MSG / MDB など）
    if (ext === 'mdb' || ext === 'accdb') return 'access';
    return 'msg';
  }
  // テキスト系（.ts は MPEG-TS 動画と重なるため、先頭が同期バイト 0x47 でなければテキスト）
  if (ext in TEXT_LANG && looksText(head) && !(ext === 'ts' && head[0] === 0x47)) return 'text';
  if (ext !== 'pdf' && ext !== 'dxf' && ext !== 'eml' && ext !== 'step' && ext !== 'stp') {
    const mk = mediaKind(ext, head); if (mk) return mk;
    if (imageSub(ext, head)) return 'image';
  }
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'eml': return 'eml';
    case 'msg': return 'msg';
    case 'stl': return 'stl';
    case 'step': case 'stp': return 'step';
    case 'iges': case 'igs': return 'iges';
    case 'dxf': return 'dxf';
    case 'u3d': return 'u3d';
    case 'zip': return 'zip';
    case 'csv': return 'csv';
    case 'sqlite': case 'sqlite3': case 'db': case 'db3': return 'sqlite';
    case 'mdb': case 'accdb': return 'access';
    case 'joblib': case 'pkl': case 'pickle': return 'joblib';
    case 'obj': case 'gltf': case 'glb': case 'ply': case '3mf': return 'model3d';
    case '7z': case 'tar': case 'gz': case 'tgz': return 'archive';
    case 'tsv': case 'tab': return 'tsv';
    case 'parquet': return 'parquet';
    case 'mbox': case 'mbx': return 'mbox';
    case 'ttf': case 'otf': case 'woff': case 'woff2': return 'font';
  }
  // 拡張子のない mbox（先頭が「From 差出人 日付」の区切り行）
  if (/^From \S+ +\S.*\d{4}\s*\r?\n/.test(text) && ext !== 'txt') return 'mbox';
  if (/^solid\s/i.test(text) && /facet/i.test(text)) return 'stl';
  if (/^\s*0\s*\r?\n\s*SECTION/.test(text)) return 'dxf';
  if (/^(From|Received|Return-Path|Message-ID|MIME-Version|Subject|Date|To|Delivered-To):/im.test(text) && ext !== 'txt') return 'eml';
  if (text.length >= 80 && text[72] === 'S' && /^.{72}S\s*\d+/.test(text)) return 'iges';
  if (looksText(head) && head.length > 0) return 'text';
  return 'unknown';
}

export function formatInfo(kind: FormatKind, ext?: string): FormatInfo | undefined {
  return (ext ? FORMATS.find((f) => f.kind === kind && f.exts.includes(ext)) : undefined) ?? FORMATS.find((f) => f.kind === kind);
}
