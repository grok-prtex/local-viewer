import { useEffect, useState } from 'react';
import { t } from './i18n';

/** 読み込み → 解析 → 形状変換 → 描画 の段階表示 */
export const STAGES = ['読み込み中', '解析中', '形状変換中', '描画中'] as const;
export type Stage = (typeof STAGES)[number];
export interface ProgressState { stage: Stage; pct?: number; detail?: string; stages?: readonly Stage[]; }

export function Progress({ p, onCancel }: { p: ProgressState; onCancel?: () => void }) {
  const [start] = useState(() => performance.now());
  const [now, setNow] = useState(start);
  useEffect(() => { const t = setInterval(() => setNow(performance.now()), 250); return () => clearInterval(t); }, []);
  const stages = p.stages ?? STAGES;
  const idx = stages.indexOf(p.stage);
  const sec = (now - start) / 1000;
  const pct = p.pct == null ? null : Math.max(0, Math.min(100, p.pct));
  return (
    <div className="progress" role="status" aria-live="polite" data-testid="progress" data-stage={p.stage}>
      <ol className="stages">
        {stages.map((s, i) => <li key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''}>{t(s)}</li>)}
      </ol>
      <div className={'bar' + (pct == null ? ' indeterminate' : '')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
        <span style={pct == null ? undefined : { width: pct + '%' }} />
      </div>
      <div className="progress-meta">
        <span>{t(p.stage)}{pct != null ? `　${Math.round(pct)}%` : ''}{p.detail ? `　${p.detail}` : ''}</span>
        <span className="mono">{sec < 60 ? t('{0} 秒', sec.toFixed(1)) : t('{0} 分 {1} 秒', Math.floor(sec / 60), Math.floor(sec % 60))}</span>
      </div>
      {onCancel && <button className="ghost" onClick={onCancel} data-testid="cancel">{t('キャンセル')}</button>}
    </div>
  );
}

/** File をストリームで読み、読み込んだバイト数の割合を通知します */
export async function readWithProgress(file: Blob, onPct: (pct: number) => void, signal?: { cancelled: boolean }): Promise<ArrayBuffer> {
  if (file.size < 2 << 20) { const b = await file.arrayBuffer(); onPct(100); return b; }
  const out = new Uint8Array(file.size); let off = 0; let last = 0;
  const reader = file.stream().getReader();
  for (;;) {
    if (signal?.cancelled) { reader.cancel(); throw new Error('cancelled'); }
    const { done, value } = await reader.read();
    if (done) break;
    out.set(value, off); off += value.length;
    const pct = (off / file.size) * 100;
    if (pct - last >= 1) { last = pct; onPct(pct); }
  }
  onPct(100);
  return out.buffer;
}

export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
