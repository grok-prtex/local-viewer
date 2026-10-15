import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loading, ErrorBox } from '../ui';

/** CSV は UTF-8 を試し、だめなら Shift_JIS として読みます */
export function decodeCsv(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^\uFEFF/, ''); }
  catch { return new TextDecoder('shift_jis').decode(b); }
}

const STEP = 1000;

export default function SheetViewer({ file, csv }: { file: File; csv?: boolean }) {
  const [wb, setWb] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState(0);
  const [err, setErr] = useState('');
  const [limit, setLimit] = useState(STEP);
  useEffect(() => {
    let alive = true;
    file.arrayBuffer().then((b) => {
      const w = csv ? XLSX.read(decodeCsv(b), { type: 'string', raw: true }) : XLSX.read(b, { type: 'array', cellDates: true });
      if (alive) { setWb(w); setSheet(0); setLimit(STEP); }
    }).catch(() => alive && setErr('表を読み込めませんでした。パスワード付きのファイルは開けません。'));
    return () => { alive = false; };
  }, [file, csv]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!wb) return <Loading>表を読み込んでいます</Loading>;
  const ws = wb.Sheets[wb.SheetNames[sheet]];
  // 大きな表は先頭から少しずつ HTML にします（5 万行を一度に描くと数秒止まるため）
  let total = 0; let html = '';
  if (ws && ws['!ref']) {
    const r = XLSX.utils.decode_range(ws['!ref']); total = r.e.r - r.s.r + 1;
    const sub = { ...ws, '!ref': XLSX.utils.encode_range({ s: r.s, e: { r: Math.min(r.e.r, r.s.r + limit - 1), c: r.e.c } }) };
    html = XLSX.utils.sheet_to_html(sub, { header: '', footer: '' });
  }
  return (
    <div>
      {wb.SheetNames.length > 1 && (
        <div className="tabs" role="tablist">
          {wb.SheetNames.map((n, i) => <button key={n} role="tab" aria-selected={i === sheet} onClick={() => { setSheet(i); setLimit(STEP); }}>{n}</button>)}
        </div>
      )}
      <div className="sheet" data-testid="sheet" dangerouslySetInnerHTML={{ __html: html }} />
      {total > limit && <p className="hint">全 {total.toLocaleString()} 行のうち {limit.toLocaleString()} 行を表示しています。<button onClick={() => setLimit((l) => l + STEP * 4)} data-testid="more-rows">さらに {Math.min(STEP * 4, total - limit).toLocaleString()} 行を表示</button></p>}
      <p className="hint">表示は値のみです。書式・図形・グラフは表示されません。</p>
    </div>
  );
}
