import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readMailHeaders, decodeWords, parseAddressList } from './mailHeaders';
const fx = (n: string) => new Uint8Array(readFileSync(new URL('../tests/fixtures/mail/' + n, import.meta.url)));
const noGarble = (s: string) => expect(s).not.toMatch(/[\u0080-\u00ff\ufffd\x1b]|\$B|=\?/);

describe('メールヘッダーの日本語', () => {
  it('ISO-2022-JP のエンコード語・折り返し件名・複数宛先', () => {
    const h = readMailHeaders(fx('jp-iso2022.eml'));
    expect(h.subject).toBe('【重要】お見積りの件について（第２回・長い件名の折り返し確認）');
    expect(h.from).toEqual([{ name: '山田 太郎', address: 'taro.yamada@example.co.jp' }]);
    expect(h.to.map((a) => a.name)).toEqual(['佐藤 花子', 'Suzuki, Ichiro', '', '田中 部長', '佐藤 花子', '', '']);
    expect(h.to[2].address).toBe('plain@example.com');
    expect(h.cc).toEqual([{ name: '長いアドレスの人', address: 'very.long.mailbox.name.for.testing.wrap@subdomain.example-corporation.co.jp' }, { name: '経理部', address: 'keiri@example.jp' }]);
  });
  it('生 8bit の Shift_JIS ヘッダー', () => {
    const h = readMailHeaders(fx('jp-sjis-raw.eml'));
    expect(h.subject).toBe('生ヘッダーの件名（Shift_JIS）');
    expect(h.from).toEqual([{ name: '営業部 高橋', address: 'takahashi@example.co.jp' }]);
    expect(h.to[0].name).toBe('取引先 御中');
  });
  it('生 ISO-2022-JP・EUC-JP エンコード語・UTF-8 Q の連結', () => {
    const h = readMailHeaders(fx('jp-mixed.eml'));
    expect(h.subject).toBe('UTF-8のQエンコード（続き）');
    expect(h.from).toEqual([{ name: '伊藤', address: 'ito@example.jp' }]);
    expect(h.to[0].name).toBe('受信者');
  });
  it('生 UTF-8 ヘッダー', () => {
    const h = readMailHeaders(fx('jp-utf8-raw.eml'));
    expect(h.subject).toBe('生UTF-8ヘッダー'); noGarble(h.from[0].name);
  });
  it('語の途中で分割された UTF-8 B エンコード語', () => {
    const b = new TextEncoder().encode('日本');
    const w1 = btoa(String.fromCharCode(...b.slice(0, 4))), w2 = btoa(String.fromCharCode(...b.slice(4)));
    expect(decodeWords(`=?UTF-8?B?${w1}?= =?UTF-8?B?${w2}?=`)).toBe('日本');
    expect(decodeWords('a =?UTF-8?Q?=E3=81=82?= b')).toBe('a あ b');
  });
  it('引用符・エスケープ・コメント・グループ', () => {
    expect(parseAddressList('"A \\"B\\" C" <a@x.jp>, d@x.jp (デー), G: e@x.jp, f@x.jp;')).toEqual([
      { name: 'A "B" C', address: 'a@x.jp' }, { name: 'デー', address: 'd@x.jp' }, { name: '', address: 'e@x.jp' }, { name: '', address: 'f@x.jp' }]);
  });
});
