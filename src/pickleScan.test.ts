import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { maybeInflate, scanPickle } from './pickleScan';

describe('pickleScan', () => {
  it('reads plain joblib without executing', async () => {
    const raw = new Uint8Array(readFileSync('tests/fixtures/sample.joblib'));
    const { bytes, compression } = await maybeInflate(raw);
    const s = scanPickle(bytes, compression);
    expect(s.protocol).toBe(4);
    expect(s.strings).toContain('見本');
    expect(s.hasUnsafeOps).toBe(false);
  });
  it('inflates zlib joblib', async () => {
    const raw = new Uint8Array(readFileSync('tests/fixtures/sample-zlib.joblib'));
    const { bytes, compression } = await maybeInflate(raw);
    expect(compression).toBe('zlib');
    expect(scanPickle(bytes, compression).strings).toContain('見本');
  });
});
  it('scans numpy joblib globals as strings', async () => {
    const raw = new Uint8Array(readFileSync('tests/fixtures/sample-np.joblib'));
    const { bytes, compression } = await maybeInflate(raw);
    const s = scanPickle(bytes, compression);
    expect(s.hasUnsafeOps).toBe(true);
    expect([...s.strings, ...s.globals].join(' ')).toMatch(/numpy|joblib/);
  });
