import { useEffect, useState } from 'react';
import type { AsyncBuffer, FileMetaData } from 'hyparquet';
import { ErrorBox } from '../ui';
import { Progress, type ProgressState } from '../progress';
import { t } from '../i18n';
import { useColResize } from './colResize';
import { cellText, colType, type PqCol } from '../parquet';

const PAGE = 500;
const ST = ['読み込み中', '解析中'] as const;

interface Meta { rows: number; cols: PqCol[]; groups: number; createdBy?: string; md: FileMetaData; file: AsyncBuffer; }

export default function ParquetViewer({ file }: { file: File }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [err, setErr] = useState('');
  const [prog] = useState<ProgressState>({ stage: '解析中', detail: t('目次を読んでいます'), stages: ST });

  useEffect(() => {
    let alive = true; setMeta(null); setRows(null); setPage(0); setErr('');
    (async () => {
      const { parquetMetadataAsync, parquetSchema, cachedAsyncBuffer } = await import('hyparquet');
      const pf = cachedAsyncBuffer({ byteLength: file.size, slice: (s: number, e?: number) => file.slice(s, e).arrayBuffer() });
      const md = await parquetMetadataAsync(pf);
      const sc = parquetSchema(md);
      const cols: PqCol[] = sc.children.map((c) => ({ name: c.element.name, type: colType(c) }));
      if (alive) setMeta({ rows: Number(md.num_rows), cols, groups: md.row_groups.length, createdBy: md.created_by, md, file: pf });
    })().catch((e) => { console.warn('parquet failed', e); if (alive) setErr(t('Parquet ファイルを読み込めませんでした。ファイルが壊れているか、対応していない形式の可能性があります。')); });
    return () => { alive = false; };
  }, [file]);

  useEffect(() => {
    if (!meta) return; let alive = true; setRows(null);
    (async () => {
      const [{ parquetReadObjects }, { compressors }] = await Promise.all([import('hyparquet'), import('hyparquet-compressors')]);
      const start = page * PAGE; const end = Math.min(meta.rows, start + PAGE);
      const r = await parquetReadObjects({ file: meta.file, metadata: meta.md, compressors, rowStart: start, rowEnd: end });
      if (alive) setRows(r as Record<string, unknown>[]);
    })().catch((e) => { console.warn('parquet rows failed', e); if (alive) setErr(t('Parquet のデータを読み込めませんでした。ファイルが壊れているか、対応していない圧縮形式の可能性があります。')); });
    return () => { alive = false; };
  }, [meta, page]);

  const n = meta?.cols.length ?? 0;
  // 最初のページが届いたら、見出し・型・中身の長さから各列の幅を決めます（長い値は 320px で切り、ドラッグで広げられます）
  const [initW, setInitW] = useState<number[] | undefined>();
  useEffect(() => {
    if (!rows || !meta || initW) return;
    const len = (x: string) => { let k = 0; for (const ch of x.slice(0, 80)) k += ch.charCodeAt(0) > 0x2e80 ? 1.9 : 1; return k; };
    const w = meta.cols.map((c) => {
      let m = Math.max(len(c.name), len(c.type) * 0.8);
      for (const r of rows.slice(0, 100)) { const v = r[c.name]; m = Math.max(m, v == null ? 4 : len(cellText(v))); }
      return Math.max(56, Math.min(320, Math.ceil(m * 7.4 + 20)));
    });
    setInitW([Math.max(40, String(meta.rows).length * 8 + 22), ...w]);
  }, [rows, meta, initW]);
  const rz = useColResize(n + 1, initW ? 'sized' : 'auto', initW);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!meta) return <Progress p={prog} />;
  const pages = Math.max(1, Math.ceil(meta.rows / PAGE));
  const start = page * PAGE;
  const pager = (
    <div className="pq-pager">
      <button onClick={() => setPage(0)} disabled={page === 0} aria-label={t('最初のページ')}>«</button>
      <button onClick={() => setPage(page - 1)} disabled={page === 0} data-testid="pq-prev">{t('前へ')}</button>
      <span className="mono" data-testid="pq-range">{meta.rows ? `${(start + 1).toLocaleString()}–${Math.min(meta.rows, start + PAGE).toLocaleString()}` : '0'} / {meta.rows.toLocaleString()}</span>
      <button onClick={() => setPage(page + 1)} disabled={page >= pages - 1} data-testid="pq-next">{t('次へ')}</button>
      <button onClick={() => setPage(pages - 1)} disabled={page >= pages - 1} aria-label={t('最後のページ')}>»</button>
    </div>
  );
  return (
    <div data-testid="parquet-view">
      <p className="meta mono" data-testid="pq-meta">{t('{0} 行 · {1} 列 · 行グループ {2}', meta.rows.toLocaleString(), meta.cols.length, meta.groups)}{meta.createdBy ? ' · ' + meta.createdBy : ''}</p>
      {pages > 1 && pager}
      <div className="sheetx pq" data-testid="sheet">
        <table ref={rz.table} style={rz.tableStyle}>
          {rz.colgroup}
          <thead>
            <tr>
              <th className="pq-idx">#{rz.handle(0)}</th>
              {meta.cols.map((c, i) => <th key={i} title={c.type}><span className="pq-name">{c.name}</span><span className="pq-type mono">{c.type}</span>{rz.handle(i + 1)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows?.map((r, ri) => (
              <tr key={ri}>
                <td className="pq-idx mono" data-ci={0}>{(start + ri + 1).toLocaleString()}</td>
                {meta.cols.map((c, ci) => { const v = r[c.name]; return v == null ? <td key={ci} data-ci={ci + 1} className="pq-null">null</td> : <td key={ci} data-ci={ci + 1}>{cellText(v)}</td>; })}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows && <div className="state"><span className="spinner" />{t('読み込み中')}</div>}
      </div>
      {pages > 1 && pager}
      <p className="hint">{t('Parquet は値のみの表示です。列名の下に型を表示しています。')}</p>
    </div>
  );
}
