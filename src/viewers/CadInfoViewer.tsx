import { useEffect, useState } from 'react';
import { parseSolidWorks, type SwInfo } from '../cadinfo';
import { Loading, ErrorBox } from '../ui';

export default function CadInfoViewer({ file }: { file: File }) {
  const [sw, setSw] = useState<SwInfo | null>(null);
  const [img, setImg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true; let url = '';
    (async () => {
      const b = new Uint8Array(await file.arrayBuffer());
      if (b[0] === 0xd0 && b[1] === 0xcf) { if (alive) setSw({ entries: [], refs: [] }); return; }
      const s = await parseSolidWorks(b);
      if (s.preview) url = URL.createObjectURL(new Blob([s.preview as BlobPart], { type: 'image/png' }));
      if (alive) { setSw(s); setImg(url); }
    })().catch(() => alive && setErr('ファイルの情報を読み取れませんでした。'));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [file]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
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
