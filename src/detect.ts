import { TEXT_LANG, looksText } from './text';
import { ftypBrand, imageSub, mediaKind } from './media';
export type FormatKind =
  | 'pdf' | 'eml' | 'msg' | 'stl' | 'step' | 'iges' | 'u3d' | 'dxf' | 'zip'
  | 'sheet' | 'csv' | 'docx' | 'pptx' | 'dwg' | 'image' | 'video' | 'audio' | 'text' | 'sqlite' | 'access' | 'joblib' | 'unknown';

export interface FormatInfo {
  kind: FormatKind;
  label: string;
  group: 'Office' | 'Mail' | 'CAD' | 'Image' | 'Media' | 'Archive' | 'Text';
  exts: string[];
  ready: boolean;
}

export const FORMATS: FormatInfo[] = [
  { kind: 'pdf', label: 'PDF（3D PDF 含む）', group: 'Office', exts: ['pdf'], ready: true },
  { kind: 'sheet', label: 'Excel', group: 'Office', exts: ['xlsx', 'xls', 'xlsm'], ready: false },
  { kind: 'csv', label: 'CSV', group: 'Office', exts: ['csv'], ready: true },
  { kind: 'docx', label: 'Word', group: 'Office', exts: ['docx'], ready: false },
  { kind: 'pptx', label: 'PowerPoint', group: 'Office', exts: ['pptx'], ready: false },
  { kind: 'sqlite', label: 'SQLite（閲覧のみ）', group: 'Office', exts: ['sqlite', 'sqlite3', 'db', 'db3'], ready: true },
  { kind: 'access', label: 'Access（閲覧のみ）', group: 'Office', exts: ['mdb', 'accdb'], ready: true },
  { kind: 'joblib', label: 'joblib / pickle（メタ情報のみ）', group: 'Office', exts: ['joblib', 'pkl', 'pickle'], ready: true },
  { kind: 'eml', label: 'EML', group: 'Mail', exts: ['eml'], ready: true },
  { kind: 'msg', label: 'Outlook MSG', group: 'Mail', exts: ['msg'], ready: true },
  { kind: 'dxf', label: 'DXF', group: 'CAD', exts: ['dxf'], ready: true },
  { kind: 'step', label: 'STEP', group: 'CAD', exts: ['step', 'stp'], ready: true },
  { kind: 'iges', label: 'IGES', group: 'CAD', exts: ['iges', 'igs'], ready: true },
  { kind: 'stl', label: 'STL', group: 'CAD', exts: ['stl'], ready: true },
  { kind: 'u3d', label: 'U3D', group: 'CAD', exts: ['u3d'], ready: true },
  { kind: 'text', label: 'テキスト・ログ・設定', group: 'Text', exts: ['txt', 'log', 'ini', 'cfg', 'conf', 'toml', 'env'], ready: true },
  { kind: 'text', label: 'Markdown（整形表示）', group: 'Text', exts: ['md'], ready: true },
  { kind: 'text', label: 'JSON / XML / YAML', group: 'Text', exts: ['json', 'xml', 'yaml', 'yml'], ready: true },
  { kind: 'text', label: 'HTML（安全な枠内で表示）', group: 'Text', exts: ['html', 'htm'], ready: true },
  { kind: 'text', label: 'PLC・NC（ST / SCL / G コード）', group: 'Text', exts: ['st', 'scl', 'nc', 'gcode', 'tap'], ready: true },
  { kind: 'text', label: 'ソースコード', group: 'Text', exts: Object.keys(TEXT_LANG).filter((x) => !['txt', 'log', 'ini', 'cfg', 'conf', 'toml', 'env', 'md', 'json', 'xml', 'yaml', 'yml', 'html', 'htm', 'st', 'scl', 'nc', 'gcode', 'tap', 'csv_txt', 'text', 'out', 'markdown', 'jsonc', 'geojson', 'xsd', 'svgz', 'plist', 'csproj', 'vcxproj', 'xhtml', 'properties', 'ngc', 'cnc'].includes(x)), ready: true },
  { kind: 'dwg', label: 'DWG', group: 'CAD', exts: ['dwg'], ready: false },
  { kind: 'image', label: '一般的な画像', group: 'Image', exts: ['png', 'jpg', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico'], ready: true },
  { kind: 'image', label: 'HEIC / HEIF', group: 'Image', exts: ['heic', 'heif'], ready: true },
  { kind: 'image', label: 'TIFF（複数ページ）', group: 'Image', exts: ['tif', 'tiff'], ready: true },
  { kind: 'image', label: 'Photoshop', group: 'Image', exts: ['psd'], ready: true },
  { kind: 'image', label: 'カメラ RAW（プレビュー）', group: 'Image', exts: ['cr2', 'cr3', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2'], ready: true },
  { kind: 'image', label: 'TGA / JPEG XL', group: 'Image', exts: ['tga', 'jxl'], ready: true },
  { kind: 'video', label: '動画', group: 'Media', exts: ['mp4', 'mov', 'webm', 'mkv'], ready: true },
  { kind: 'audio', label: '音声', group: 'Media', exts: ['mp3', 'wav', 'm4a', 'ogg', 'flac'], ready: true },
  { kind: 'video', label: 'AVI / WMV / FLV', group: 'Media', exts: ['avi', 'wmv', 'flv'], ready: false },
  { kind: 'zip', label: 'ZIP', group: 'Archive', exts: ['zip'], ready: true },
];

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

function startsWith(b: Uint8Array, sig: number[]): boolean {
  return sig.every((v, i) => b[i] === v);
}

function ascii(b: Uint8Array, n = 512): string {
  let s = '';
  for (let i = 0; i < Math.min(n, b.length); i++) s += String.fromCharCode(b[i]);
  return s;
}

/**
 * ファイル名と先頭バイトから形式を判定します。
 * 中身のシグネチャを優先し、判別できない場合は拡張子で判定します。
 */
export function detectFormat(name: string, head: Uint8Array): FormatKind {
  const ext = extOf(name);
  const text = ascii(head);
  const brand = ftypBrand(head);
  if (brand) {
    if (imageSub(ext, head) === 'heic' || /^(avif|avis|crx )$/.test(brand)) return 'image';
    const mk = mediaKind(ext, head); if (mk) return mk;
  }
  if (ext === 'joblib' || ext === 'pkl' || ext === 'pickle') return 'joblib';
  if (ext === 'mdb' || ext === 'accdb' || ascii(head).startsWith('Standard Jet DB') || ascii(head).startsWith('Standard ACE DB')) return 'access';
  if (ascii(head).startsWith('SQLite format 3')) return 'sqlite';
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (/^\s*ISO-10303-21/.test(text)) return 'step';
  if (startsWith(head, [0x55, 0x33, 0x44, 0x00])) return 'u3d';
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])) {
    // ZIP コンテナ（Office Open XML も ZIP）
    if (ext === 'xlsx' || ext === 'xlsm') return 'sheet';
    if (ext === 'docx') return 'docx';
    if (ext === 'pptx') return 'pptx';
    return 'zip';
  }
  // SolidWorks（sldprt / sldasm / slddrw）は非対応（2026-10-16 削除）。OLE 判定より前に止める
  if (ext === 'sldprt' || ext === 'sldasm' || ext === 'slddrw') return 'unknown';
  // Parasolid（x_t / x_b）はブラウザだけでは形状表示できないため非対応（2026-10-16 削除）
  if (ext === 'x_t' || ext === 'x_b' || ext === 'xmt_txt' || ext === 'xmt_bin') return 'unknown';
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // OLE2 複合ファイル（MSG / XLS / MDB など）
    if (ext === 'xls') return 'sheet';
    if (ext === 'mdb' || ext === 'accdb') return 'access';
    return 'msg';
  }
  if (/^AC10\d\d/.test(text)) return 'dwg';
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
    case 'xlsx': case 'xls': case 'xlsm': return 'sheet';
    case 'csv': return 'csv';
    case 'docx': return 'docx';
    case 'pptx': return 'pptx';
    case 'sqlite': case 'sqlite3': case 'db': case 'db3': return 'sqlite';
    case 'mdb': case 'accdb': return 'access';
    case 'joblib': case 'pkl': case 'pickle': return 'joblib';
    case 'dwg': return 'dwg';
  }
  if (/^solid\s/i.test(text) && /facet/i.test(text)) return 'stl';
  if (/^\s*0\s*\r?\n\s*SECTION/.test(text)) return 'dxf';
  if (/^(From|Received|Return-Path|Message-ID|MIME-Version|Subject|Date|To|Delivered-To):/im.test(text) && ext !== 'txt') return 'eml';
  if (text.length >= 80 && text[72] === 'S' && /^.{72}S\s*\d+/.test(text)) return 'iges';
  if (ext !== 'dwg' && looksText(head) && head.length > 0) return 'text';
  return 'unknown';
}

export function formatInfo(kind: FormatKind): FormatInfo | undefined {
  return FORMATS.find((f) => f.kind === kind);
}
