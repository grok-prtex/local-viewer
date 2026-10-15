import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { detectFormat, extOf } from './detect';
const fx = (n: string) => new Uint8Array(readFileSync(new URL('../tests/fixtures/' + n, import.meta.url)));
const enc = (s: string) => new TextEncoder().encode(s);

describe('extOf', () => {
  it('拡張子を小文字で返す', () => { expect(extOf('A.B.STP')).toBe('stp'); expect(extOf('noext')).toBe(''); });
});

describe('detectFormat', () => {
  it('fixtures', () => {
    expect(detectFormat('sample.pdf', fx('sample.pdf'))).toBe('pdf');
    expect(detectFormat('sample.eml', fx('sample.eml'))).toBe('eml');
    expect(detectFormat('sample.stl', fx('sample.stl'))).toBe('stl');
    expect(detectFormat('sample.step', fx('sample.step'))).toBe('step');
    expect(detectFormat('sample.igs', fx('sample.igs'))).toBe('iges');
    expect(detectFormat('sample.dxf', fx('sample.dxf'))).toBe('dxf');
    expect(detectFormat('sample.zip', fx('sample.zip'))).toBe('zip');
    expect(detectFormat('sample.csv', fx('sample.csv'))).toBe('csv');
  });
  it('拡張子が違っても中身で判定する', () => {
    expect(detectFormat('mitsumori.dat', fx('sample.pdf'))).toBe('pdf');
    expect(detectFormat('model.txt', fx('sample.step'))).toBe('step');
    expect(detectFormat('noext', fx('sample.igs'))).toBe('iges');
    expect(detectFormat('drawing', fx('sample.dxf'))).toBe('dxf');
  });
  it('ZIP コンテナの Office 形式', () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);
    expect(detectFormat('a.xlsx', zip)).toBe('sheet');
    expect(detectFormat('a.docx', zip)).toBe('docx');
    expect(detectFormat('a.pptx', zip)).toBe('pptx');
    expect(detectFormat('a.bin', zip)).toBe('zip');
  });
  it('OLE2 は MSG / XLS', () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(detectFormat('a.msg', ole)).toBe('msg');
    expect(detectFormat('a.xls', ole)).toBe('sheet');
  });
  it('バイナリ STL は拡張子で判定する', () => {
    expect(detectFormat('part.STL', new Uint8Array(84))).toBe('stl');
  });
  it('DWG と未対応', () => {
    expect(detectFormat('a.dwg', enc('AC1032xxxx'))).toBe('dwg');
    expect(detectFormat('data.xyz', new Uint8Array([1, 2, 3]))).toBe('unknown');
  });
});

describe('画像・動画の判定', () => {
  const m = (n: string) => fx('media/' + n);
  it('画像', () => {
    for (const n of ['sample.png', 'sample.jpg', 'sample.gif', 'sample.webp', 'sample.heic', 'sample.tif', 'sample.psd', 'sample.cr2', 'sample.jxl', 'sample.svg', 'sample.tga', 'sample.ico', 'sample.bmp'])
      expect(detectFormat(n, m(n)), n).toBe('image');
    expect(detectFormat('noext', m('sample.heic'))).toBe('image');
  });
  it('動画・音声', () => {
    for (const n of ['sample.mp4', 'sample.webm', 'sample.avi', 'sample.flv']) expect(detectFormat(n, m(n)), n).toBe('video');
    for (const n of ['sample.wav', 'sample.mp3']) expect(detectFormat(n, m(n)), n).toBe('audio');
    expect(detectFormat('clip.bin', m('sample.mp4'))).toBe('video');
  });
});

describe('CAD info formats', () => {
  it('detects Parasolid and SolidWorks', () => {
    const h = new TextEncoder().encode('**ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz**************************\n**PARASOLID');
    expect(detectFormat('a.x_b', h)).toBe('parasolid');
    expect(detectFormat('noext', h)).toBe('parasolid');
    expect(detectFormat('a.SLDPRT', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe('sw');
    expect(detectFormat('a.sldasm', new Uint8Array(8))).toBe('sw');
  });
});
