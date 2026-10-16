import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { t } from '../i18n';

export const MIN_COL = 40;
const MAX_AUTO = 640;
const INIT_CAP = 320;

/**
 * 表の列幅をドラッグで変更します。ダブルクリックで中身に合わせて自動調整、矢印キーで ±10px。
 * 最初に操作したとき、全列の現在幅を測って固定レイアウトに切り替えます。
 */
export function useColResize(n: number, resetKey: unknown, init?: number[]) {
  const table = useRef<HTMLTableElement>(null);
  const [w, setW] = useState<number[] | null>(init ?? null);
  const initRef = useRef(init); initRef.current = init;
  useEffect(() => { setW(initRef.current ?? null); }, [resetKey, n]);
  const [active, setActive] = useState<number | null>(null);

  /** 見出しと先頭 500 行の中身の幅（上限 cap） */
  const fitWidth = useCallback((i: number, cap: number): number => {
    const tb = table.current; if (!tb) return 96;
    const cells = [tb.tHead?.rows[0]?.cells[i], ...Array.from(tb.querySelectorAll<HTMLElement>(`tbody td[data-ci="${i}"]`)).slice(0, 500)].filter(Boolean) as HTMLElement[];
    const ctx = document.createElement('canvas').getContext('2d')!;
    let best = MIN_COL;
    for (const c of cells) {
      const cs = getComputedStyle(c); ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2;
      const txt = (c.textContent ?? '').split('\n').reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
      best = Math.max(best, txt + pad + (c.tagName === 'TH' ? 10 : 0));
    }
    return Math.min(cap, Math.ceil(best));
  }, []);

  /** 初回は各列を内容に合った幅（上限 INIT_CAP）にして固定レイアウトへ切り替えます */
  const measure = useCallback((): number[] => {
    if (w && w.length === n) return [...w];
    return Array.from({ length: n }, (_, i) => fitWidth(i, INIT_CAP));
  }, [w, n, fitWidth]);

  const setOne = (base: number[], i: number, px: number) => { base[i] = Math.max(MIN_COL, Math.round(px)); setW([...base]); };

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const base = measure(), x0 = e.clientX, w0 = base[i];
    const el = e.currentTarget; el.setPointerCapture?.(e.pointerId);
    setActive(i); document.body.classList.add('col-resizing');
    const move = (ev: PointerEvent) => setOne(base, i, w0 + ev.clientX - x0);
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); setActive(null); document.body.classList.remove('col-resizing'); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };

  /** ダブルクリック：中身に合わせます */
  const autofit = (i: number) => setOne(measure(), i, fitWidth(i, MAX_AUTO));

  const onKeyDown = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.key === 'Enter') { autofit(i); return; }
    const base = measure(); setOne(base, i, base[i] + (e.key === 'ArrowRight' ? 10 : -10));
  };

  const handle = (i: number) => (
    <span className={'col-rs' + (active === i ? ' active' : '')} role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={t('列幅を変更（ダブルクリックで自動調整）')} title={t('列幅を変更（ダブルクリックで自動調整）')}
      aria-valuenow={w?.[i]} data-testid={`col-rs-${i}`}
      onPointerDown={onPointerDown(i)} onDoubleClick={(e) => { e.stopPropagation(); autofit(i); }} onKeyDown={onKeyDown(i)} onClick={(e) => e.stopPropagation()} />
  );
  const tableStyle: CSSProperties | undefined = w && w.length === n ? { tableLayout: 'fixed', width: w.reduce((a, b) => a + b, 0), minWidth: 0 } : undefined;
  const colgroup = w && w.length === n ? <colgroup>{w.map((x, i) => <col key={i} style={{ width: x }} />)}</colgroup> : null;
  return { table, widths: w, handle, tableStyle, colgroup, sized: !!tableStyle };
}

export const colName = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
