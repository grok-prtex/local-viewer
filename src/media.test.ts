import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { probeMedia } from './media';

describe('再生できない動画の形式案内', () => {
  it('4 MB の AVI でもスタックあふれせずにコンテナとコーデックを返す', () => {
    const b = new Uint8Array(4 << 20);
    const put = (o: number, s: string) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    put(0, 'RIFF'); put(8, 'AVI '); put(200, 'strh'); put(208, 'vids'); put(212, 'FMP4');
    const r = probeMedia(b);
    expect(r.container).toBe('AVI');
    expect(r.codecs).toContain('FMP4');
  });
  it('ASF（WMV）', () => {
    const b = new Uint8Array(1 << 20); b[0] = 0x30; b[1] = 0x26;
    expect(probeMedia(b).container).toBe('ASF (WMV / WMA)');
  });
  const avi = 'tests/fixtures/media/sample.avi';
  it.skipIf(!existsSync(avi))('同梱の AVI', () => {
    expect(probeMedia(new Uint8Array(readFileSync(avi))).container).toBe('AVI');
  });
});
