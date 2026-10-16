import { useEffect, useMemo, useRef, useState } from 'react';
import MDBReader from 'mdb-reader';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, type ProgressState } from '../progress';

const PAGE = 100;

function cell(v: unknown): string {
  if (v == null) return 'NULL';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toLocaleString('ja-JP');
  if (typeof ArrayBuffer !== 'undefined' && v instanceof ArrayBuffer) return `バイナリ（${v.byteLength} バイト）`;
  if (v instanceof Uint8Array) return `バイナリ（${v.length} バイト）`;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
  return String(v);
}

export default function AccessViewer({ file }: { file: File }) {
  const readerRef = useRef<MDBReader | null>(null);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ['読み込み中', '解析中'] });
  const [tables, setTables] = useState<string[]>([]);
  const [cur, setCur] = useState('');
  const [cols, setCols] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [off, setOff] = useState(0);
  const [sys, setSys] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    readerRef.current = null;
    (async () => {
      const buf = await readWithProgress(file, (pct) => alive && setProg({ stage: '読み込み中', pct, stages: ['読み込み中', '解析中'] }));
      if (alive) setProg({ stage: '解析中', stages: ['読み込み中', '解析中'] });
      const reader = new MDBReader(Buffer.from(buf));
      if (!alive) return;
      readerRef.current = reader;
      const names = reader.getTableNames({ normalTables: true, systemTables: false, linkedTables: true });
      setTables(names);
      setCur(names[0] || '');
    })().catch(() => alive && setErr('Access データベースを開けませんでした。パスワード付きや未対応の形式の可能性があります。'));
    return () => { alive = false; readerRef.current = null; };
  }, [file]);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader || !cur) return;
    try {
      const t = reader.getTable(cur);
      const data = t.getData() as Record<string, unknown>[];
      setCols(t.getColumnNames());
      setRows(data);
      setCounts((c) => ({ ...c, [cur]: data.length }));
      setOff(0);
      setErr('');
    } catch {
      setErr('テーブル「' + cur + '」を読めませんでした。');
      setRows([]); setCols([]);
    }
  }, [cur, tables]);

  const page = useMemo(() => rows.slice(off, off + PAGE), [rows, off]);

  if (err && !tables.length) return <ErrorBox>{err}</ErrorBox>;
  if (!tables.length) return <Progress p={prog} />;

  return (
    <div className="sql">
      {err && <ErrorBox>{err}</ErrorBox>}
      <div className="sql-layout">
        <aside className="sql-side">
          <div className="label mono">TABLES · {tables.length}</div>
          <ul data-testid="access-tables">
            {tables.map((n) => (
              <li key={n}>
                <button className={cur === n ? 'on' : ''} onClick={() => setCur(n)} title={n}>
                  <span className="tname">{n}</span>
                  <span className="mono">{counts[n] != null ? `${counts[n]} 行` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
          <label className="hint" style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input type="checkbox" checked={sys} onChange={(e) => {
              const on = e.target.checked; setSys(on);
              const reader = readerRef.current; if (!reader) return;
              const names = reader.getTableNames({ normalTables: true, systemTables: on, linkedTables: true });
              setTables(names);
              if (!names.includes(cur)) setCur(names[0] || '');
            }} />
            システム表も表示
          </label>
        </aside>
        <div>
          <div className="sheetx dbgrid" data-testid="access-grid">
            <table>
              <thead><tr>{cols.map((c) => <th key={c} title={c}><span className="c">{c}</span></th>)}</tr></thead>
              <tbody>
                {page.map((r, i) => (
                  <tr key={i}>{cols.map((c) => r[c] == null ? <td key={c}><span className="null">NULL</span></td> : <td key={c} title={cell(r[c])}><span className="c">{cell(r[c])}</span></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PAGE && (
            <div className="toolbar">
              <button disabled={off === 0} onClick={() => setOff(Math.max(0, off - PAGE))}>前へ</button>
              <span className="mono">{off + 1}–{Math.min(off + PAGE, rows.length)} / {rows.length}</span>
              <button disabled={off + PAGE >= rows.length} onClick={() => setOff(off + PAGE)}>次へ</button>
            </div>
          )}
        </div>
      </div>
      <p className="hint">Access（MDB / ACCDB）は閲覧のみです。クエリ・フォーム・レポート・マクロは表示しません。大きな表はページ送りします。</p>
    </div>
  );
}
