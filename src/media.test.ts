import { describe, it, expect } from 'vitest';
import { probeMedia } from './media';

describe('再生できない動画・音声の形式案内', () => {
  it('4 MB の MKV でもスタックあふれせずにコンテナとコーデックを返す', () => {
    const b = new Uint8Array(4 << 20);
    const put = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    b[0] = 0x1a; b[1] = 0x45; b[2] = 0xdf; b[3] = 0xa3; put(3 << 20, 'V_MPEGH/ISO/HEVC');
    const r = probeMedia(b);
    expect(r.container).toBe('Matroska (MKV)');
    expect(r.codecs).toContain('V_MPEGH/ISO/HEVC');
  });
  it('ASF（WMA）', () => {
    const b = new Uint8Array(1 << 20); b[0] = 0x30; b[1] = 0x26;
    expect(probeMedia(b).container).toBe('ASF (WMA)');
  });
});
