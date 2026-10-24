import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { detectFormat } from './detect';
import { decodeName, isTar, listTar, bytesReader, gzipName, innerName, gunzip, ArcError } from './archive';
import { parseMbox, splitMbox, unescapeFrom, messageBytes, emlName } from './mbox';
import { splitTsv, decodeCsv } from './viewers/csv';
import { colType, cellText } from './parquet';

const fx = (n: string) => new Uint8Array(readFileSync(new URL('../tests/fixtures/newfmt/' + n, import.meta.url)));
const enc = (s: string) => new TextEncoder().encode(s);

describe('detectFormat（追加した形式）', () => {
  it('中身と拡張子で判定する', () => {
    expect(detectFormat('a.7z', fx('japanese.7z'))).toBe('archive');
    expect(detectFormat('a.tar', fx('japanese.tar'))).toBe('archive');
    expect(detectFormat('a.tar.gz', fx('japanese.tar.gz'))).toBe('archive');
    expect(detectFormat('memo.txt.gz', fx('memo.txt.gz'))).toBe('archive');
    expect(detectFormat('a.mbox', fx('mixed.mbox'))).toBe('mbox');
    expect(detectFormat('a.tsv', fx('symbol.tsv'))).toBe('tsv');
    expect(detectFormat('a.parquet', fx('alltypes_plain.parquet'))).toBe('parquet');
    expect(detectFormat('x.dat', fx('alltypes_plain.parquet'))).toBe('parquet');
    expect(detectFormat('a.woff2', fx('inter-latin-700.woff2'))).toBe('font');
    expect(detectFormat('a.obj', fx('cube.obj'))).toBe('model3d');
    expect(detectFormat('a.3mf', fx('pyramid_vertexcolor.3mf'))).toBe('model3d');
    expect(detectFormat('a.gltf', fx('Box_embedded.gltf'))).toBe('model3d');
    expect(detectFormat('a.ply', fx('dolphins.ply'))).toBe('model3d');
  });
});

describe('tar / gzip', () => {
  it('日本語名の tar を一覧にする', async () => {
    const b = fx('japanese.tar');
    expect(isTar(b.subarray(0, 512))).toBe(true);
    const l = await listTar(bytesReader(b), b.length);
    const names = l.entries.map((e) => e.name);
    expect(names).toContain('フォルダ/日本語メモ.txt');
    expect(l.entries.find((e) => e.name.endsWith('data.tsv'))?.size).toBe(54);
    expect(l.truncated).toBe(false);
  });
  it('壊れた tar は判定しない', () => { expect(isTar(fx('broken.7z').subarray(0, 512))).toBe(false); });
  it('Shift_JIS の名前も読める', () => { expect(decodeName(new Uint8Array([0x93, 0xfa, 0x96, 0x7b]))).toBe('日本'); });
  it('gzip の元の名前と展開', async () => {
    const g = fx('memo.txt.gz');
    expect(innerName('memo.txt.gz', g)).toMatch(/\.txt$/);
    expect(innerName('a.tgz', new Uint8Array(10))).toBe('a.tar');
    expect(gzipName(new Uint8Array([1, 2, 3]))).toBeUndefined();
    const out = await gunzip(new Blob([fx('japanese.tar.gz')]));
    expect(isTar(out.subarray(0, 512))).toBe(true);
  });
  it('gzip の上限と壊れたデータ', async () => {
    await expect(gunzip(new Blob([fx('japanese.tar.gz')]), 100)).rejects.toMatchObject({ code: 'too-large' });
    await expect(gunzip(new Blob([new Uint8Array([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 3, 1, 2, 3])]))).rejects.toBeInstanceOf(ArcError);
  });
});

describe('MBOX', () => {
  it('UTF-8 / ISO-2022-JP / Shift_JIS の件名と差出人を読む', () => {
    const b = fx('mixed.mbox');
    const ms = parseMbox(b);
    expect(ms.length).toBe(splitMbox(b).length);
    expect(ms.length).toBeGreaterThanOrEqual(4);
    const subj = ms.map((m) => m.subject).join('\n');
    expect(subj).toContain('UTF-8 の件名');
    expect(subj).toContain('ISO-2022-JP の件名テスト');
    expect(subj).toContain('Shift_JIS');
    expect(subj).not.toMatch(/\uFFFD|ã|æ|縺/);
    expect(ms[0].from[0].address).toBe('taro@example.jp');
    expect(ms.every((m) => m.date instanceof Date)).toBe(true);
  });
  it('本文の >From を戻す', () => {
    const b = enc('From a@b Mon Jan 1 00:00:00 2024\nSubject: x\n\n>From here\n>>From there\n');
    const [m] = parseMbox(b);
    const t = new TextDecoder().decode(messageBytes(b, m));
    expect(t).toContain('\nFrom here\n>From there');
    expect(unescapeFrom(enc('plain\n'))).toEqual(enc('plain\n'));
  });
  it('本文中の From は区切りにしない', () => {
    expect(splitMbox(enc('From a@b Mon Jan 1 00:00:00 2024\nSubject: x\n\nFrom me, hello\n')).length).toBe(1);
  });
  it('保存名', () => { expect(emlName('a/b:c', 0)).toBe('a_b_c.eml'); expect(emlName('', 2)).toBe('message-3.eml'); });
});

describe('TSV', () => {
  it('タブで分ける', () => {
    const r = splitTsv('名前\t値\nあ\t1\t余り\n\n');
    expect(r?.ncols).toBe(3);
    expect(r?.lines.length).toBe(3);
    // 引用符で始まる値があるときは表計算と同じ読み方に任せる（実際の mozc の記号表）
    expect(splitTsv(new TextDecoder().decode(fx('symbol.tsv')))).toBeNull();
  });
  it('UTF-16 も読む', () => {
    const s = 'a\tあ\n'; const u = new Uint8Array(2 + s.length * 2); u[0] = 0xff; u[1] = 0xfe;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); u[2 + i * 2] = c & 255; u[3 + i * 2] = c >> 8; }
    expect(decodeCsv(u.buffer)).toBe(s);
  });
});

describe('Parquet', () => {
  it('列の型', async () => {
    const { parquetMetadata, parquetSchema } = await import('hyparquet');
    const b = fx('alltypes_plain.parquet');
    const meta = parquetMetadata(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    expect(Number(meta.num_rows)).toBe(8);
    const types = parquetSchema(meta).children.map((c) => colType(c as never));
    expect(types).toContain('INT32');
    expect(types).toContain('BOOLEAN');
    expect(colType({ element: { name: 'p', type: 'FIXED_LEN_BYTE_ARRAY', logical_type: { type: 'DECIMAL', precision: 10, scale: 2 } }, children: [] })).toBe('DECIMAL(10,2)');
    expect(colType({ element: { name: 'l', converted_type: 'UTF8', type: 'BYTE_ARRAY', repetition_type: 'REPEATED' }, children: [] })).toBe('STRING[]');
  });
  it('値の表示', () => {
    expect(cellText(12n)).toBe('12');
    expect(cellText(new Date(Date.UTC(2024, 0, 2)))).toBe('2024-01-02');
    expect(cellText(enc('日本'))).toBe('日本');
    expect(cellText(new Uint8Array([0, 255]))).toBe('0x00ff');
    expect(cellText({ a: 1n })).toBe('{"a":"1"}');
    expect(cellText('x'.repeat(500)).length).toBe(401);
  });
});
