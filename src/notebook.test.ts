import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseNotebook, stripAnsi } from './notebook';

describe('ipynb', () => {
  const nb = parseNotebook(readFileSync('tests/fixtures/notebook/sample.ipynb', 'utf8'));
  it('セル種別・番号・言語', () => {
    expect(nb.lang).toBe('python'); expect(nb.hlLang).toBe('python');
    expect(nb.cells.map((c) => c.type)).toEqual(['markdown', 'code', 'code', 'code', 'code', 'code', 'code', 'raw']);
    const c1 = nb.cells[1]; expect(c1.type === 'code' && c1.count).toBe(1);
    const c6 = nb.cells[6]; expect(c6.type === 'code' && c6.count).toBe(null);
  });
  it('出力：stdout / stderr / html / 画像 / エラー（ANSI 除去）', () => {
    const outs = nb.cells.flatMap((c) => (c.type === 'code' ? c.outputs : []));
    expect(outs.map((o) => o.kind)).toEqual(['stream', 'stream', 'html', 'image', 'error']);
    const img = outs[3]; expect(img.kind === 'image' && img.src.startsWith('data:image/png;base64,')).toBe(true);
    const er = outs[4]; expect(er.kind === 'error' && er.traceback).not.toMatch(/\x1b/);
    expect(stripAnsi('\x1b[0;31mX\x1b[0m')).toBe('X');
  });
  it('markdown の添付画像を data URI に', () => {
    const m = nb.cells[0]; expect(m.type === 'markdown' && m.source).toMatch(/data:image\/png;base64,/);
  });
  it('言語の既定は Python、nbformat 3 も読む', () => {
    const v3 = parseNotebook(JSON.stringify({ nbformat: 3, metadata: {}, worksheets: [{ cells: [{ cell_type: 'code', input: 'x=1', prompt_number: 7, outputs: [{ output_type: 'pyout', text: ['1'] }] }, { cell_type: 'heading', level: 2, source: 'H' }] }] }));
    expect(v3.hlLang).toBe('python');
    expect(v3.cells[0]).toMatchObject({ type: 'code', source: 'x=1', count: 7 });
    expect(v3.cells[1]).toMatchObject({ type: 'markdown', source: '## H' });
    expect(parseNotebook('{"cells":[],"metadata":{"kernelspec":{"language":"R"}}}').hlLang).toBe('r');
  });
  it('壊れた JSON はエラー', () => { expect(() => parseNotebook('{oops')).toThrow(); });
});
