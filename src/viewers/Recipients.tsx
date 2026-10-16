import { useEffect, useId, useRef, useState } from 'react';
import type { MailAddr } from '../mailHeaders';

const SHOW = 5;
const domain = (a: string) => a.split('@')[1] ?? '';

function Person({ a, showDomain }: { a: MailAddr; showDomain: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const label = a.name || a.address;
  const copy = async () => {
    try { await navigator.clipboard.writeText(a.address); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 権限がない環境では何もしない */ }
  };
  return (
    <span className="person" ref={wrap}>
      <button ref={btn} type="button" className="person-chip" title={a.name ? a.address : undefined}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => { setOpen((o) => !o); setCopied(false); }} data-testid="person">
        <span className="person-name">{label}</span>
        {showDomain && a.name && domain(a.address) && <span className="person-domain mono">@{domain(a.address)}</span>}
      </button>
      {open && (
        <span className="person-pop" role="dialog" id={id} aria-label={`${label} の連絡先`} data-testid="person-pop">
          {a.name && <span className="pop-name">{a.name}</span>}
          <span className="pop-addr mono">{a.address || '（アドレスなし）'}</span>
          {a.address && <button type="button" className="pop-copy" onClick={copy} autoFocus>{copied ? 'コピーしました' : 'コピー'}</button>}
        </span>
      )}
    </span>
  );
}

export default function Recipients({ list, testid }: { list: MailAddr[]; testid?: string }) {
  const [all, setAll] = useState(false);
  if (!list.length) return <span className="hint">—</span>;
  const count = new Map<string, number>();
  for (const a of list) if (a.name) count.set(a.name, (count.get(a.name) ?? 0) + 1);
  const shown = all ? list : list.slice(0, SHOW);
  return (
    <span className="people" data-testid={testid}>
      {shown.map((a, i) => <Person key={i} a={a} showDomain={(count.get(a.name) ?? 0) > 1} />)}
      {list.length > SHOW && (
        <button type="button" className="people-more" onClick={() => setAll((x) => !x)} aria-expanded={all}>
          {all ? '折りたたむ' : `ほか ${list.length - SHOW} 件`}
        </button>
      )}
    </span>
  );
}
