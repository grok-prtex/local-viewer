import { Fragment, useEffect, useState } from 'react';
import { parasolidNames, parseParasolidHeader, parseSolidWorks, type ParasolidInfo, type SwInfo } from '../cadinfo';
import { Loading, ErrorBox } from '../ui';

const PS_LABELS: Record<string, string> = { APPL: '作成ソフト', FRU: 'Parasolid のバージョン', KEY: 'モデル名', FILE: '元のファイル名', DATE: '作成日時', SCH: 'スキーマ', OS: 'OS', FORMAT: '形式' };

export default function CadInfoViewer({ file, kind }: { file: File; kind: 'parasolid' | 'sw' }) {
  const [ps, setPs] = useState<ParasolidInfo | null>(null);
  const [sw, setSw] = useState<SwInfo | null>(null);
  const [img, setImg] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true; let url = '';
    (async () => {
      if (kind === 'parasolid') { const all = new Uint8Array(await file.arrayBuffer()); const p = parseParasolidHeader(all); if (alive) { setPs(p); if (p.format.startsWith('バイナリ')) setNames(parasolidNames(all)); } return; }
      const b = new Uint8Array(await file.arrayBuffer());
      if (b[0] === 0xd0 && b[1] === 0xcf) { if (alive) setSw({ entries: [], refs: [] }); return; }
      const s = await parseSolidWorks(b);
      if (s.preview) url = URL.createObjectURL(new Blob([s.preview as BlobPart], { type: 'image/png' }));
      if (alive) { setSw(s); setImg(url); }
    })().catch(() => alive && setErr('ファイルの情報を読み取れませんでした。'));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [file, kind]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (kind === 'parasolid') {
    if (!ps) return <Loading>ヘッダーを読んでいます</Loading>;
    return (
      <div className="cadinfo">
        <div className="state notice">Parasolid（{ps.format}）の形状表示は準備中です。ファイルのヘッダー情報だけを表示しています。STEP で書き出したファイルなら 3D で表示できます。</div>
        <dl className="mail-head" data-testid="ps-info">
          {Object.entries(PS_LABELS).filter(([k]) => ps.fields[k]).map(([k, l]) => <Fragment key={k}><dt>{l}</dt><dd className="mono">{ps.fields[k]}</dd></Fragment>)}
        </dl>
        {names.length > 0 && (
          <div className="attachments">
            <div className="label mono">PART NAMES · {names.length}</div>
            <p className="hint">ファイル内の名前属性から読み取った部品・サブアセンブリ名です（階層と個数は表示できません）。</p>
            <ul data-testid="ps-names">{names.map((n) => <li key={n}><span className="att-name mono">{n}</span></li>)}</ul>
          </div>
        )}
      </div>
    );
  }
  if (!sw) return <Loading>ファイルを読んでいます</Loading>;
  const isAsm = /\.sldasm$/i.test(file.name);
  return (
    <div className="cadinfo">
      <div className="state notice">SolidWorks の{isAsm ? 'アセンブリ（SLDASM）' : '部品（SLDPRT）'}の 3D 表示には対応していません。{img ? 'ファイルに保存されているプレビュー画像を表示しています。' : ''}SolidWorks から STEP で書き出すと、3D で表示できます。</div>
      {img ? <img className="sw-preview" src={img} alt="SolidWorks のプレビュー画像" data-testid="sw-preview" /> : <p className="hint">プレビュー画像は見つかりませんでした{sw.entries.length === 0 ? '（古い形式の SolidWorks ファイルです）' : ''}。</p>}
      {isAsm && sw.refs.length > 0 && (
        <div className="attachments">
          <div className="label mono">REFERENCED FILES · {sw.refs.length}</div>
          <ul data-testid="sw-refs">{sw.refs.map((r) => <li key={r}><span className="att-name mono">{r}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}
