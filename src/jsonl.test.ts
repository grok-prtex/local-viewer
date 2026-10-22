import { describe, it, expect } from 'vitest';
import { formatJsonl, parseJsonLoose, stripJsonc } from './jsonl';
import { textMode } from './text';
import { detectFormat } from './detect';

const enc = (s: string) => new TextEncoder().encode(s);

describe('JSON Lines', () => {
  it('拡張子 .jsonl / .ndjson / .jsonlines を JSON Lines として扱う', () => {
    for (const x of ['jsonl', 'ndjson', 'jsonlines']) {
      expect(textMode(x)).toBe('jsonl');
      expect(detectFormat('a.' + x, enc('{"a":1}\n{"a":2}\n'))).toBe('text');
    }
  });
  it('1 行ずつ整形し、元の行番号を持つ。空行は飛ばす', () => {
    const r = formatJsonl('{"a":1,"b":[1,2]}\n\n  \n{"c":"x"}\r\n[1]\n');
    expect(r.total).toBe(3); expect(r.errors).toBe(0); expect(r.truncated).toBe(false);
    expect(r.records.map((x) => x.line)).toEqual([1, 4, 5]);
    expect(r.records[0].pretty).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
    expect(r.records[1].pretty).toBe('{\n  "c": "x"\n}');
  });
  it('読めない行はその行だけ元のまま・理由付きで、他の行は整形する', () => {
    const r = formatJsonl('{"ok":1}\n{"broken": \n{"ok":2}');
    expect(r.errors).toBe(1);
    expect(r.records[1]).toMatchObject({ line: 2, raw: '{"broken": ' });
    expect(r.records[1].error).toBeTruthy();
    expect(r.records[2].pretty).toContain('"ok": 2');
  });
  it('BOM 付きでも 1 行目を読める', () => {
    expect(formatJsonl('\uFEFF{"a":1}\n').records[0].pretty).toBe('{\n  "a": 1\n}');
  });
  it('大きいファイルは上限で打ち切り、全体の件数は数える', () => {
    const big = Array.from({ length: 100_000 }, (_, i) => JSON.stringify({ i, name: 'item' + i, tags: ['a', 'b'] })).join('\n');
    const t0 = performance.now();
    const r = formatJsonl(big, 2000);
    expect(performance.now() - t0).toBeLessThan(1500);
    expect(r.total).toBe(100_000); expect(r.records.length).toBe(2000); expect(r.truncated).toBe(true);
    const r2 = formatJsonl(big, 1e9, 10_000);
    expect(r2.records.length).toBeLessThan(300); expect(r2.truncated).toBe(true);
  });
});

describe('JSONC', () => {
  it('コメントと末尾のカンマを除く（文字列の中は触らない）', () => {
    const src = '{\n  // 行コメント\n  "url": "http://a.b/c,]", /* 範囲\n コメント */\n  "s": "a // b /* c */",\n  "arr": [1, 2, ],\n  "o": {"x": 1,},\n  "esc": "q\\"//x",\n}\n';
    const v = JSON.parse(stripJsonc(src));
    expect(v).toEqual({ url: 'http://a.b/c,]', s: 'a // b /* c */', arr: [1, 2], o: { x: 1 }, esc: 'q"//x' });
    expect(stripJsonc(src).split('\n').length).toBe(src.split('\n').length);
  });
  it('厳密な JSON はそのまま、だめなときだけ緩く読む', () => {
    expect(parseJsonLoose('{"a":[1,2]}')).toEqual({ value: { a: [1, 2] }, loose: false });
    expect(parseJsonLoose('{"a":1, // x\n}')).toEqual({ value: { a: 1 }, loose: true });
    expect(() => parseJsonLoose('{"a":')).toThrow();
  });
});
