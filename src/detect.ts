export type FormatKind =
  | 'pdf' | 'eml' | 'msg' | 'stl' | 'step' | 'iges' | 'dxf' | 'zip'
  | 'sheet' | 'csv' | 'docx' | 'pptx' | 'dwg' | 'unknown';

export interface FormatInfo {
  kind: FormatKind;
  label: string;
  group: 'Office' | 'Mail' | 'CAD' | 'Archive';
  exts: string[];
  ready: boolean;
}

export const FORMATS: FormatInfo[] = [
  { kind: 'pdf', label: 'PDF', group: 'Office', exts: ['pdf'], ready: true },
  { kind: 'sheet', label: 'Excel', group: 'Office', exts: ['xlsx', 'xls'], ready: true },
  { kind: 'csv', label: 'CSV', group: 'Office', exts: ['csv'], ready: true },
  { kind: 'docx', label: 'Word', group: 'Office', exts: ['docx'], ready: true },
  { kind: 'pptx', label: 'PowerPoint', group: 'Office', exts: ['pptx'], ready: false },
  { kind: 'eml', label: 'EML', group: 'Mail', exts: ['eml'], ready: true },
  { kind: 'msg', label: 'Outlook MSG', group: 'Mail', exts: ['msg'], ready: true },
  { kind: 'dxf', label: 'DXF', group: 'CAD', exts: ['dxf'], ready: true },
  { kind: 'step', label: 'STEP', group: 'CAD', exts: ['step', 'stp'], ready: true },
  { kind: 'iges', label: 'IGES', group: 'CAD', exts: ['iges', 'igs'], ready: true },
  { kind: 'stl', label: 'STL', group: 'CAD', exts: ['stl'], ready: true },
  { kind: 'dwg', label: 'DWG', group: 'CAD', exts: ['dwg'], ready: false },
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
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (/^\s*ISO-10303-21/.test(text)) return 'step';
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06])) {
    // ZIP コンテナ（Office Open XML も ZIP）
    if (ext === 'xlsx' || ext === 'xlsm') return 'sheet';
    if (ext === 'docx') return 'docx';
    if (ext === 'pptx') return 'pptx';
    return 'zip';
  }
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // OLE2 複合ファイル（MSG / XLS など）
    if (ext === 'xls') return 'sheet';
    return 'msg';
  }
  if (/^AC10\d\d/.test(text)) return 'dwg';
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'eml': return 'eml';
    case 'msg': return 'msg';
    case 'stl': return 'stl';
    case 'step': case 'stp': return 'step';
    case 'iges': case 'igs': return 'iges';
    case 'dxf': return 'dxf';
    case 'zip': return 'zip';
    case 'xlsx': case 'xls': case 'xlsm': return 'sheet';
    case 'csv': return 'csv';
    case 'docx': return 'docx';
    case 'pptx': return 'pptx';
    case 'dwg': return 'dwg';
  }
  if (/^solid\s/i.test(text) && /facet/i.test(text)) return 'stl';
  if (/^\s*0\s*\r?\n\s*SECTION/.test(text)) return 'dxf';
  if (/^(From|Received|Return-Path|Message-ID|MIME-Version|Subject|Date|To|Delivered-To):/im.test(text) && ext !== 'txt') return 'eml';
  if (text.length >= 80 && text[72] === 'S' && /^.{72}S\s*\d+/.test(text)) return 'iges';
  return 'unknown';
}

export function formatInfo(kind: FormatKind): FormatInfo | undefined {
  return FORMATS.find((f) => f.kind === kind);
}
