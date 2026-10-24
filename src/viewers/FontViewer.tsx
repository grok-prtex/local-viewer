import { useEffect, useMemo, useState } from 'react';
import type { FkFont } from 'fontkit';
import { ErrorBox, Loading } from '../ui';
import { t, getLang } from '../i18n';
import { size } from './Mail';

const SIZES = [12, 16, 24, 36, 48, 72];
const GRID = 384;
let seq = 0;

function formatOf(h: Uint8Array): string {
  const s = String.fromCharCode(...h.subarray(0, 4));
  if (s === 'wOFF') return 'WOFF'; if (s === 'wOF2') return 'WOFF2'; if (s === 'OTTO') return 'OpenType (CFF)';
  return 'TrueType';
}

interface Loaded { font: FkFont; family: string; face: FontFace; format: string; chars: number[]; jp: boolean; }

export default function FontViewer({ file }: { file: File }) {
  const [d, setD] = useState<Loaded | null>(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [axes, setAxes] = useState<Record<string, number>>({});
  const [shown, setShown] = useState(GRID);

  useEffect(() => {
    let alive = true; let face: FontFace | null = null;
    (async () => {
      const buf = new Uint8Array(await file.arrayBuffer());
      const fk = await import('fontkit');
      let font = fk.create(buf);
      if (font.fonts?.length) font = font.fonts[0]; // コレクションは最初の 1 書体
      if (!font.numGlyphs) throw new Error('empty');
      const family = `lv-font-${++seq}`;
      face = new FontFace(family, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
      await face.load(); document.fonts.add(face);
      const chars = [...new Set(font.characterSet)].filter((c) => c > 32 && !(c >= 0x7f && c <= 0x9f) && !(c >= 0xd800 && c <= 0xdfff)).sort((a, b) => a - b);
      const jp = chars.includes(0x3042) || chars.includes(0x65e5);
      const ax: Record<string, number> = {}; for (const [k, a] of Object.entries(font.variationAxes ?? {})) ax[k] = a.default;
      if (alive) { setD({ font, family, face, format: formatOf(buf), chars, jp }); setAxes(ax); setShown(GRID); }
    })().catch((e) => { console.warn('font failed', e); if (alive) setErr(t('フォントを読み込めませんでした。ファイルが壊れているか、対応していない形式の可能性があります。')); });
    return () => { alive = false; if (face) document.fonts.delete(face); };
  }, [file]);

  const style = useMemo(() => (d ? {
    fontFamily: `'${d.family}', var(--font-sans)`,
    fontVariationSettings: Object.keys(axes).length ? Object.entries(axes).map(([k, v]) => `'${k}' ${v}`).join(', ') : undefined,
  } : undefined), [d, axes]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!d) return <Loading>{t('読み込み中')}</Loading>;
  const f = d.font;
  const jaName = getLang() === 'ja' ? f.getName?.('fontFamily', 'ja') : null;
  const sampleJa = d.jp ? 'あのイーハトーヴォのすきとおった風、夏でも底に冷たさをもつ青いそら。' : '';
  const sampleEn = 'The quick brown fox jumps over the lazy dog. 0123456789';
  const info: [string, string | undefined][] = [
    [t('フォント名'), f.fullName || f.postscriptName],
    [t('ファミリー'), (f.familyName ?? '') + (jaName && jaName !== f.familyName ? ` / ${jaName}` : '')],
    [t('スタイル'), f.subfamilyName],
    [t('形式'), d.format],
    [t('グリフ数'), f.numGlyphs.toLocaleString()],
    [t('文字数'), d.chars.length.toLocaleString()],
    [t('バージョン'), f.version?.replace(/^Version\s*/i, '')],
    [t('大きさ'), size(file.size)],
  ];
  const axList = Object.entries(f.variationAxes ?? {});
  return (
    <div className="fontv" data-testid="font-view">
      <dl className="font-info" data-testid="font-info">
        {info.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {f.copyright && <p className="hint font-copy">{f.copyright}</p>}
      {axList.length > 0 && (
        <div className="font-axes" data-testid="font-axes">
          <div className="label mono">{t('可変軸')}</div>
          {axList.map(([k, a]) => (
            <label key={k} className="font-axis">
              <span className="mono">{a.name || k}</span>
              <input type="range" min={a.min} max={a.max} step={(a.max - a.min) / 100 || 1} value={axes[k] ?? a.default} onChange={(e) => setAxes({ ...axes, [k]: Number(e.target.value) })} />
              <span className="mono">{Math.round(axes[k] ?? a.default)}</span>
            </label>
          ))}
        </div>
      )}
      {!d.jp && <p className="hint" data-testid="font-nojp">{t('このフォントには日本語の文字が入っていません。日本語の見本は表示しません。')}</p>}
      <label className="font-edit">
        <span className="label mono">{t('サンプル')}</span>
        <input type="text" value={text} placeholder={t('ここに文字を入力すると、見本がその文字に変わります')} onChange={(e) => setText(e.target.value)} data-testid="font-input" />
      </label>
      <div className="font-samples" style={style} data-testid="font-samples">
        {SIZES.map((s) => (
          <div key={s} className="font-sample">
            <span className="mono font-size-label">{s}px</span>
            <div style={{ fontSize: s }}>
              {text ? <p>{text}</p> : <>{sampleJa && <p lang="ja">{sampleJa}</p>}<p lang="en">{sampleEn}</p></>}
            </div>
          </div>
        ))}
      </div>
      <div className="label mono">{t('文字一覧')} · {d.chars.length.toLocaleString()}</div>
      <ul className="glyphs" style={style} data-testid="glyph-grid">
        {d.chars.slice(0, shown).map((c) => {
          const hex = 'U+' + c.toString(16).toUpperCase().padStart(4, '0');
          return <li key={c} title={hex}><span className="g">{String.fromCodePoint(c)}</span><span className="u mono">{hex}</span></li>;
        })}
      </ul>
      {d.chars.length > shown && <p className="hint">{t('全 {0} 文字のうち {1} 文字を表示しています。', d.chars.length.toLocaleString(), shown.toLocaleString())}<button onClick={() => setShown((n) => n + GRID * 2)} data-testid="more-glyphs">{t('さらに表示')}</button></p>}
    </div>
  );
}
