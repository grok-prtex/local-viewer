/** 画像・動画・音声の形式判定と、再生できない動画のコンテナ／コーデック情報の読み取り */
export type ImageSub = 'native' | 'heic' | 'tiff' | 'psd' | 'raw' | 'tga' | 'jxl' | 'svg';
export const NATIVE_IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'jfif', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg'];
export const RAW_EXTS = ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'dng', 'raf', 'orf', 'rw2', 'pef', 'srw', 'x3f', 'erf', 'kdc', 'mrw', '3fr', 'iiq', 'rwl'];
export const VIDEO_EXTS = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'mpg', 'mpeg', 'ts', 'm2ts', 'mts', '3gp', 'ogv'];
export const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wma'];

const ascii = (b: Uint8Array, s: number, n: number) => String.fromCharCode(...b.subarray(s, s + n));

/** ISO BMFF（ftyp）のブランドを返します */
export function ftypBrand(h: Uint8Array): string | null {
  return h.length >= 12 && ascii(h, 4, 4) === 'ftyp' ? ascii(h, 8, 4) : null;
}

export function imageSub(ext: string, h: Uint8Array): ImageSub | null {
  const brand = ftypBrand(h);
  if (brand && /^(heic|heix|heim|heis|hevc|hevx|mif1|msf1)$/.test(brand) && ext !== 'avif') return 'heic';
  if (brand && /^(avif|avis)$/.test(brand)) return 'native';
  if (brand === 'crx ') return 'raw';
  if (ascii(h, 0, 4) === '8BPS') return 'psd';
  if ((h[0] === 0xff && h[1] === 0x0a) || ascii(h, 4, 4) === 'JXL ') return 'jxl';
  const tiff = (h[0] === 0x49 && h[1] === 0x49 && (h[2] === 0x2a || h[2] === 0x52 || h[2] === 0x55)) || (h[0] === 0x4d && h[1] === 0x4d && h[3] === 0x2a);
  if (RAW_EXTS.includes(ext) || ascii(h, 0, 8) === 'FUJIFILM') return 'raw';
  if (tiff) return 'tiff';
  if (ext === 'tif' || ext === 'tiff') return 'tiff';
  if (ext === 'tga') return 'tga';
  if (ext === 'heic' || ext === 'heif') return 'heic';
  if (ext === 'jxl') return 'jxl';
  if (ext === 'psd') return 'psd';
  const t = ascii(h, 0, Math.min(h.length, 256));
  if (ext === 'svg' || /<svg[\s>]/i.test(t)) return 'svg';
  if (h[0] === 0x89 && t.slice(1, 4) === 'PNG') return 'native';
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'native';
  if (t.startsWith('GIF8') || (t.startsWith('RIFF') && t.slice(8, 12) === 'WEBP') || t.startsWith('BM') && ext === 'bmp') return 'native';
  if (h[0] === 0 && h[1] === 0 && h[2] === 1 && h[3] === 0 && ext === 'ico') return 'native';
  if (NATIVE_IMAGE_EXTS.includes(ext)) return 'native';
  return null;
}

export type MediaKind = 'video' | 'audio';
export function mediaKind(ext: string, h: Uint8Array): MediaKind | null {
  const t = ascii(h, 0, 12);
  const brand = ftypBrand(h);
  if (brand) return /^(M4A |M4B |mp4a)$/.test(brand) || ext === 'm4a' ? 'audio' : 'video';
  if (t.startsWith('RIFF') && t.slice(8, 12) === 'AVI ') return 'video';
  if (t.startsWith('RIFF') && t.slice(8, 12) === 'WAVE') return 'audio';
  if (h[0] === 0x1a && h[1] === 0x45 && h[2] === 0xdf && h[3] === 0xa3) return ext === 'mka' ? 'audio' : 'video';
  if (t.startsWith('FLV')) return 'video';
  if (h[0] === 0x30 && h[1] === 0x26 && h[2] === 0xb2 && h[3] === 0x75) return ext === 'wma' ? 'audio' : 'video';
  if (t.startsWith('OggS')) return ext === 'ogv' ? 'video' : 'audio';
  if (t.startsWith('ID3') || t.startsWith('fLaC') || (h[0] === 0xff && (h[1] & 0xe0) === 0xe0 && AUDIO_EXTS.includes(ext))) return 'audio';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  return null;
}

/** コンテナ名と、読み取れたコーデック名 */
export function probeMedia(b: Uint8Array): { container: string; codecs: string[] } {
  const t = ascii(b, 0, 12);
  const codecs = new Set<string>();
  const s = ascii(b, 0, Math.min(b.length, 4 << 20));
  let container = '不明';
  if (ftypBrand(b)) {
    container = ftypBrand(b) === 'qt  ' ? 'QuickTime（MOV）' : `MP4（${ftypBrand(b)!.trim()}）`;
    for (let i = s.indexOf('stsd'); i >= 0; i = s.indexOf('stsd', i + 4)) { const fcc = s.slice(i + 16, i + 20); if (/^[\w. -]{4}$/.test(fcc)) codecs.add(fcc.trim()); }
  } else if (t.startsWith('RIFF') && t.slice(8, 12) === 'AVI ') {
    container = 'AVI';
    for (let i = s.indexOf('strh'); i >= 0; i = s.indexOf('strh', i + 4)) {
      const type = s.slice(i + 8, i + 12), h = s.slice(i + 12, i + 16);
      if (type === 'vids') codecs.add(h.replace(/\0/g, '').trim() || '（不明）');
      if (type === 'auds') { const f = s.indexOf('strf', i); if (f > 0) { const tag = b[f + 8] | (b[f + 9] << 8); codecs.add(({ 1: 'PCM', 0x55: 'MP3', 0xff: 'AAC', 0x2000: 'AC-3', 0x161: 'WMA' } as Record<number, string>)[tag] ?? `音声 0x${tag.toString(16)}`); } }
    }
  } else if (b[0] === 0x1a && b[1] === 0x45) {
    container = /webm/.test(s.slice(0, 64)) ? 'WebM' : 'Matroska（MKV）';
    for (const m of s.matchAll(/[VAS]_[A-Z0-9][A-Z0-9/._-]{1,30}/g)) codecs.add(m[0]);
  } else if (t.startsWith('FLV')) {
    container = 'FLV';
    const vc = ({ 2: 'Sorenson H.263', 3: 'Screen video', 4: 'VP6', 5: 'VP6 Alpha', 7: 'H.264' } as Record<number, string>);
    let o = (b[5] << 24 | b[6] << 16 | b[7] << 8 | b[8]) + 4;
    for (let n = 0; n < 50 && o + 12 < b.length; n++) {
      const type = b[o], size = b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3];
      if (type === 9) codecs.add(vc[b[o + 11] & 0x0f] ?? '映像（不明）');
      if (type === 8) codecs.add((b[o + 11] >> 4) === 10 ? 'AAC' : (b[o + 11] >> 4) === 2 ? 'MP3' : '音声（その他）');
      o += 11 + size + 4;
    }
  } else if (b[0] === 0x30 && b[1] === 0x26) container = 'ASF（WMV / WMA）';
  else if (t.startsWith('OggS')) container = 'Ogg';
  else if (b[0] === 0x47 && b[188] === 0x47) container = 'MPEG-TS';
  else if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0xba) container = 'MPEG-PS（MPG）';
  return { container, codecs: [...codecs].slice(0, 6) };
}

/** RAW に埋め込まれた JPEG プレビューの候補位置 */
export function jpegCandidates(b: Uint8Array, max = 12): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.length - 3 && out.length < 200; i++) if (b[i] === 0xff && b[i + 1] === 0xd8 && b[i + 2] === 0xff) out.push(i);
  return out.slice(0, max * 4);
}
