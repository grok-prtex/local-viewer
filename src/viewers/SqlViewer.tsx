import { useEffect, useRef, useState } from 'react';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, type ProgressState } from '../progress';
import { t } from '../i18n';
import { useColResize } from './colResize';

interface TInfo { name: string; type: string; }
const PAGE = 100;

function call(w: Worker, data: object, transfer?: Transferable[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const on = (e: MessageEvent) => { w.removeEventListener('message', on); e.data.ok ? resolve(e.data) : reject(new Error(e.data.error)); };
    w.addEventListener('message', on);
    w.postMessage(data, transfer as any);
  });
}

export default function SqlViewer({ file }: { file: File }) {
  const [meta, setMeta] = useState<{ tables: TInfo[]; schemas: Record<string, any[][]>; counts: Record<string, number | null> } | null>(null);
  const [cur, setCur] = useState('');
  const [rows, setRows] = useState<{ cols: string[]; values: any[][] } | null>(null);
  const [off, setOff] = useState(0);
  const [sql, setSql] = useState('');
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ['読み込み中', '解析中'] });
  const job = useRef<{ cancel?: () => void; buf?: ArrayBuffer }>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await readWithProgress(file, (pct) => alive && setProg({ stage: '読み込み中', pct, stages: ['読み込み中', '解析中'] }));
      if (alive) setProg({ stage: '解析中', stages: ['読み込み中', '解析中'] });
      const w = new Worker('/sql-worker.js?v=' + __COMMIT__);
      job.current.cancel = () => w.terminate();
      job.current.buf = buf.slice(0);
      const m = await call(w, { buffer: buf }, [buf]);
      w.terminate();
      if (!alive) return;
      setMeta(m);
      if (m.tables[0]) setCur(m.tables[0].name);
    })().catch((e) => alive && setErr(String(e?.message) === 'cancelled' ? t('読み込みをキャンセルしました。') : t('SQLite データベースを開けませんでした。')));
    return () => { alive = false; job.current.cancel?.(); };
  }, [file]);

  useEffect(() => {
    if (!meta || !cur || !job.current.buf) return;
    let alive = true;
    (async () => {
      const w = new Worker('/sql-worker.js?v=' + __COMMIT__);
      const buf = job.current.buf!.slice(0);
      const q = `SELECT * FROM ${JSON.stringify(cur)} LIMIT ${PAGE} OFFSET ${off}`;
      const r = await call(w, { buffer: buf, sql: q }, [buf]);
      w.terminate();
      if (!alive) return;
      const block = r.result[0];
      setRows(block ? { cols: block.columns, values: block.values } : { cols: [], values: [] });
    })().catch((e) => alive && setErr(t('テーブルを読めませんでした：{0}', e.message)));
    return () => { alive = false; };
  }, [meta, cur, off]);

  const runSql = async () => {
    if (!job.current.buf || !sql.trim()) return;
    try {
      const w = new Worker('/sql-worker.js?v=' + __COMMIT__);
      const buf = job.current.buf.slice(0);
      const r = await call(w, { buffer: buf, sql: sql.trim() }, [buf]);
      w.terminate();
      const block = r.result[0];
      setRows(block ? { cols: block.columns, values: block.values } : { cols: [], values: [] });
      setCur(''); setOff(0);
    } catch (e: any) {
      setErr(e?.message === 'readonly' ? t('書き込みや変更を伴う SQL は実行できません（閲覧のみです）。') : t('SQL を実行できませんでした：{0}', e.message));
    }
  };

  const rz = useColResize(rows?.cols.length ?? 0, `${cur}|${rows?.cols.join('\u0001')}`);
  if (err && !meta) return <ErrorBox>{err}</ErrorBox>;
  if (!meta) return <Progress p={prog} onCancel={() => job.current.cancel?.()} />;
  const total = cur ? meta.counts[cur] : null;
  return (
    <div className="sql">
      {err && <ErrorBox>{err}</ErrorBox>}
      <div className="sql-layout">
        <aside className="sql-side">
          <div className="label mono">TABLES · {meta.tables.length}</div>
          <ul data-testid="sql-tables">
            {meta.tables.map((t) => (
              <li key={t.name}><button className={cur === t.name ? 'on' : ''} onClick={() => { setCur(t.name); setOff(0); setSql(''); setErr(''); }} title={t.name}><span className="tname">{t.name}</span><span className="mono">{t.type}{meta.counts[t.name] != null ? ` · ${meta.counts[t.name]}` : ''}</span></button></li>
            ))}
          </ul>
        </aside>
        <div>
          {cur && meta.schemas[cur] && (
            <details className="sql-schema"><summary>{t('スキーマ（{0}）', cur)}</summary>
              <table><thead><tr><th>{t('列')}</th><th>{t('型')}</th><th>PK</th></tr></thead>
                <tbody>{meta.schemas[cur].map((r) => <tr key={r[0]}><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td>{r[5] ? '✓' : ''}</td></tr>)}</tbody>
              </table>
            </details>
          )}
          <div className="sql-query">
            <input value={sql} onChange={(e) => setSql(e.target.value)} placeholder={t('SELECT …（読み取り専用）')} data-testid="sql-input"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runSql(); }} />
            <button onClick={runSql} data-testid="sql-run">{t('実行')}</button>
          </div>
          {rows && (
            <div className="sheetx dbgrid" data-testid="sql-grid">
              <table ref={rz.table} style={rz.tableStyle} className={rz.sized ? 'sized' : undefined}>
                {rz.colgroup}
                <thead><tr>{rows.cols.map((c, i) => <th key={c} title={c}><span className="c">{c}</span>{rz.handle(i)}</th>)}</tr></thead>
                <tbody>
                  {rows.values.map((r, i) => (
                    <tr key={i}>{r.map((v, j) => { const txt = v instanceof Uint8Array ? t('BLOB（{0} バイト）', v.length) : String(v); return v == null ? <td key={j} data-ci={j}><span className="null">NULL</span></td> : <td key={j} data-ci={j} title={txt}><span className="c">{txt}</span></td>; })}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {cur && total != null && total > PAGE && (
            <div className="toolbar">
              <button disabled={off === 0} onClick={() => setOff(Math.max(0, off - PAGE))}>{t('前へ')}</button>
              <span className="mono">{off + 1}–{Math.min(off + PAGE, total)} / {total}</span>
              <button disabled={off + PAGE >= total} onClick={() => setOff(off + PAGE)}>{t('次へ')}</button>
            </div>
          )}
        </div>
      </div>
      <p className="hint">{t('データベースは閲覧のみです。変更は保存されず、外部にも送信しません。')}</p>
    </div>
  );
}
