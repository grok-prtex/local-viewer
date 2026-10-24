import { useEffect, useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, type ProgressState } from '../progress';
import { decodeCsv, splitTsv } from './csv';
import { t } from '../i18n';
import { colName, useColResize } from './colResize';

interface Cell { c: number; v: string; bg: string | null; fg: string | null; b: boolean; i: boolean; u: boolean; sz: number | null; ha: string | null; va: string | null; wrap: boolean; bt: string | null; bb: string | null; bl: string | null; br: string | null; }
interface Row { h: number; hidden: boolean; cells: Cell[]; }
/** lines：TSV の速い読み方（行の文字列だけを持ち、表示する行だけをタブで分けます） */
interface Sheet { name: string; cols: { w: number; hidden: boolean }[]; rows: Row[]; lines?: string[]; merges: { r: number; c: number; rowspan: number; colspan: number }[]; freeze: { x: number; y: number } | null; }

const ROW_H = 22;
const VIS = 400; // 一度に描く行数（仮想化の簡易版：必要に応じて増やす）

function runXlsx(buf: ArrayBuffer, job: { cancel?: () => void }): Promise<Sheet[]> {
  return new Promise((resolve, reject) => {
    const w = new Worker('/xlsx-worker.js?v=' + __COMMIT__);
    job.cancel = () => { w.terminate(); reject(new Error('cancelled')); };
    w.onmessage = (e) => { w.terminate(); e.data.ok ? resolve(e.data.sheets) : reject(new Error(e.data.error)); };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message)); };
    w.postMessage({ buffer: buf }, [buf]);
  });
}

const plainCell = (x: number, v: string): Cell => ({ c: x, v, bg: null, fg: null, b: false, i: false, u: false, sz: null, ha: null, va: null, wrap: false, bt: null, bb: null, bl: null, br: null });
function tsvSheet(name: string, text: string): Sheet[] | null {
  const s = splitTsv(text); if (!s) return null;
  return [{ name, cols: Array.from({ length: s.ncols }, () => ({ w: 96, hidden: false })), rows: [], lines: s.lines, merges: [], freeze: null }];
}
const rowCount = (ws: Sheet) => ws.lines?.length ?? ws.rows.length;
function rowsOf(ws: Sheet, n: number): Row[] {
  if (!ws.lines) return ws.rows.slice(0, n);
  return ws.lines.slice(0, n).map((l) => ({ h: ROW_H, hidden: false, cells: l.split('\t').map((v, x) => plainCell(x, v)) }));
}

/** CSV と古い XLS（.xls）は書式なしの値表示にします */
function plainSheets(wb: XLSX.WorkBook): Sheet[] {
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) return { name, cols: [], rows: [], merges: [], freeze: null };
    const r = XLSX.utils.decode_range(ws['!ref']);
    const rows: Row[] = [];
    for (let y = r.s.r; y <= r.e.r; y++) {
      const cells: Cell[] = [];
      for (let x = r.s.c; x <= r.e.c; x++) { const c = ws[XLSX.utils.encode_cell({ r: y, c: x })]; cells.push({ c: x, v: c ? String(c.w ?? c.v ?? '') : '', bg: null, fg: null, b: false, i: false, u: false, sz: null, ha: null, va: null, wrap: false, bt: null, bb: null, bl: null, br: null }); }
      rows.push({ h: ROW_H, hidden: false, cells });
    }
    const merges = (ws['!merges'] ?? []).map((m) => ({ r: m.s.r, c: m.s.c, rowspan: m.e.r - m.s.r + 1, colspan: m.e.c - m.s.c + 1 }));
    return { name, cols: Array.from({ length: r.e.c + 1 }, () => ({ w: 96, hidden: false })), rows, merges, freeze: null };
  });
}

export default function SheetViewer({ file, csv, xls, tsv }: { file: File; csv?: boolean; xls?: boolean; tsv?: boolean }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [cur, setCur] = useState(0);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ['読み込み中', '解析中'] });
  const [shown, setShown] = useState(VIS);
  const job = useRef<{ cancel?: () => void }>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const buf = await readWithProgress(file, (pct) => alive && setProg({ stage: '読み込み中', pct, stages: ['読み込み中', '解析中'] }));
      if (alive) setProg({ stage: '解析中', stages: ['読み込み中', '解析中'] });
      const text = csv || tsv ? decodeCsv(buf) : '';
      if (tsv && /[\u0000-\u0008\u000e-\u001a]/.test(text.slice(0, 65536))) throw new Error('binary');
      const s = tsv ? tsvSheet(file.name.replace(/\.[^.]+$/, '') || 'TSV', text) ?? plainSheets(XLSX.read(text, { type: 'string', raw: true, FS: '\t' }))
        : csv ? plainSheets(XLSX.read(text, { type: 'string', raw: true }))
        : xls ? plainSheets(XLSX.read(buf, { type: 'array', cellDates: true }))
        : await runXlsx(buf, job.current);
      if (alive) { setSheets(s); setCur(0); setShown(VIS); }
    })().catch((e) => { if (!alive) return; if (String(e?.message) === 'cancelled') setErr(t('読み込みをキャンセルしました。')); else if (String(e?.message) === 'binary') setErr(t('タブ区切りのテキストとして読み込めませんでした。ファイルが壊れているか、テキストではない可能性があります。')); else setErr(t('表を読み込めませんでした。パスワード付きのファイルは開けません。')); });
    return () => { alive = false; job.current.cancel?.(); };
  }, [file, csv, xls, tsv]);

  const wsv = sheets?.[cur];
  const vcols = useMemo(() => (wsv ? wsv.cols.filter((c) => !c.hidden) : []), [wsv]);
  const rz = useColResize(vcols.length, `${cur}|${sheets?.length}`, useMemo(() => vcols.map((c) => c.w), [vcols]));
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!sheets) return <Progress p={prog} onCancel={xls || csv ? undefined : () => job.current.cancel?.()} />;
  const ws = sheets[cur];
  const cover = new Map<string, { rowspan: number; colspan: number }>();
  const skip = new Set<string>();
  for (const m of ws.merges) { cover.set(`${m.r},${m.c}`, { rowspan: m.rowspan, colspan: m.colspan }); for (let y = m.r; y < m.r + m.rowspan; y++) for (let x = m.c; x < m.c + m.colspan; x++) if (y !== m.r || x !== m.c) skip.add(`${y},${x}`); }
  const rows = rowsOf(ws, shown);
  const vis = new Map<number, number>(); ws.cols.forEach((c, i) => { if (!c.hidden) vis.set(i, vis.size); });
  return (
    <div>
      {sheets.length > 1 && <div className="tabs" role="tablist">{sheets.map((s, i) => <button key={s.name + i} role="tab" aria-selected={i === cur} onClick={() => { setCur(i); setShown(VIS); }}>{s.name}</button>)}</div>}
      <div className="sheetx" data-testid="sheet">
        <table ref={rz.table} style={rz.tableStyle}>
          {rz.colgroup ?? <colgroup>{vcols.map((c, i) => <col key={i} style={{ width: c.w }} />)}</colgroup>}
          <thead className="letters"><tr>{vcols.map((_, i) => <th key={i}>{colName(i)}{rz.handle(i)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, ri) => r.hidden ? null : (
              <tr key={ri} style={{ height: r.h }}>
                {r.cells.filter((c) => !ws.cols[c.c]?.hidden && !skip.has(`${ri},${c.c}`)).map((c) => {
                  const sp = cover.get(`${ri},${c.c}`);
                  const st: Record<string, string | number> = {};
                  if (c.bg) st.background = c.bg; if (c.fg) st.color = c.fg; if (c.b) st.fontWeight = 700; if (c.i) st.fontStyle = 'italic'; if (c.u) st.textDecoration = 'underline';
                  if (c.sz) st.fontSize = c.sz + 'pt'; if (c.ha) st.textAlign = c.ha === 'centerContinuous' ? 'center' : c.ha; if (c.va) st.verticalAlign = c.va === 'center' ? 'middle' : c.va;
                  if (c.wrap) st.whiteSpace = 'pre-wrap';
                  const bd = (e: string | null) => e ? `1px solid ${e}` : undefined;
                  if (c.bt) st.borderTop = bd(c.bt)!; if (c.bb) st.borderBottom = bd(c.bb)!; if (c.bl) st.borderLeft = bd(c.bl)!; if (c.br) st.borderRight = bd(c.br)!;
                  return <td key={c.c} data-ci={vis.get(c.c)} rowSpan={sp?.rowspan} colSpan={sp?.colspan} style={st}>{c.v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rowCount(ws) > shown && <p className="hint">{t('全 {0} 行のうち {1} 行を表示しています。', rowCount(ws).toLocaleString(), shown.toLocaleString())}<button onClick={() => setShown((n) => n + VIS * 2)} data-testid="more-rows">{t('さらに表示')}</button></p>}
      <p className="hint">{xls ? t('XLS（古い形式）は値のみの表示です。') : tsv ? t('TSV は値のみの表示です。') : csv ? t('CSV は値のみの表示です。') : t('グラフ・画像・マクロは表示しません。方眼紙のような帳票では列幅や結合の見え方が Excel と違うことがあります。')}{ws.freeze ? t(' ウィンドウ枠の固定（{0} 行・{1} 列）は表示のみで、スクロール固定はしません。', ws.freeze.y, ws.freeze.x) : ''}</p>
    </div>
  );
}
