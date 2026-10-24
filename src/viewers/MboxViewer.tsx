import { useEffect, useMemo, useState } from 'react';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, type ProgressState } from '../progress';
import { t } from '../i18n';
import Recipients from './Recipients';
import { emlName, messageBytes, parseMbox, type MboxMsg } from '../mbox';

const PAGE = 500;
const MAX = 1024 * 1024 * 1024;
const ST = ['読み込み中', '解析中'] as const;
/** 戻ったときに読み直さないよう、ファイルごとに結果を覚えます */
const cache = new WeakMap<File, { buf: Uint8Array; list: MboxMsg[]; shown: number; q: string }>();

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date | null) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '—');

export default function MboxViewer({ file, onOpen }: { file: File; onOpen: (f: File) => void }) {
  const [data, setData] = useState(() => cache.get(file) ?? null);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ST });
  const [shown, setShown] = useState(() => cache.get(file)?.shown ?? PAGE);
  const [q, setQ] = useState(() => cache.get(file)?.q ?? '');

  useEffect(() => {
    if (cache.has(file)) { setData(cache.get(file)!); return; }
    let alive = true;
    (async () => {
      if (file.size > MAX) throw new Error('large');
      const buf = new Uint8Array(await readWithProgress(file, (pct) => alive && setProg({ stage: '読み込み中', pct, stages: ST })));
      if (alive) setProg({ stage: '解析中', detail: t('メールを数えています'), stages: ST });
      await new Promise((r) => setTimeout(r, 0));
      const list = parseMbox(buf);
      if (!list.length) throw new Error('empty');
      const d = { buf, list, shown: PAGE, q: '' };
      cache.set(file, d); if (alive) setData(d);
    })().catch((e) => {
      if (!alive) return;
      const m = String(e?.message);
      setErr(m === 'large' ? t('ファイルが大きすぎるため開けません（上限 1 GB）。') : t('MBOX として読み込めませんでした。メールが見つからないか、ファイルが壊れている可能性があります。'));
    });
    return () => { alive = false; };
  }, [file]);

  useEffect(() => { const d = cache.get(file); if (d) { d.shown = shown; d.q = q; } }, [file, shown, q]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const k = q.trim().toLowerCase();
    const idx = data.list.map((m, i) => ({ m, i }));
    if (!k) return idx;
    return idx.filter(({ m }) => m.subject.toLowerCase().includes(k) || m.from.some((a) => (a.name + ' ' + a.address).toLowerCase().includes(k)));
  }, [data, q]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!data) return <Progress p={prog} />;
  const open = (m: MboxMsg, i: number) => onOpen(new File([messageBytes(data.buf, m) as BlobPart], emlName(m.subject, i), { type: 'message/rfc822' }));
  return (
    <div className="mbox" data-testid="mbox-view">
      <div className="mbox-bar">
        <div className="label mono">{t('メッセージ')} · {data.list.length.toLocaleString()}</div>
        <input type="search" className="mbox-q" placeholder={t('件名・差出人で絞り込み')} aria-label={t('件名・差出人で絞り込み')} value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} data-testid="mbox-q" />
      </div>
      <ul className="mbox-list" data-testid="mbox-list">
        {filtered.slice(0, shown).map(({ m, i }) => (
          <li key={i} className="mbox-row" data-testid="mbox-row">
            <span className="mbox-date mono">{fmtDate(m.date)}</span>
            <span className="mbox-from"><Recipients list={m.from.slice(0, 1)} /></span>
            <button type="button" className="mbox-subj" onClick={() => open(m, i)} data-testid="mbox-open">{m.subject || t('（件名なし）')}</button>
          </li>
        ))}
      </ul>
      {!filtered.length && <p className="hint">{t('該当するメールはありません。')}</p>}
      {filtered.length > shown && <p className="hint">{t('全 {0} 通のうち {1} 通を表示しています。', filtered.length.toLocaleString(), shown.toLocaleString())}<button onClick={() => setShown((n) => n + PAGE)} data-testid="more-rows">{t('さらに表示')}</button></p>}
      <p className="hint">{t('件名をクリックすると、そのメールを開きます。差出人の名前をクリックするとアドレスを確認・コピーできます。')}</p>
    </div>
  );
}
