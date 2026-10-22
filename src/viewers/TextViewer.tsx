import { useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown } from '../markdown';
import { decodeText, textMode, TEXT_LANG, type TextMode } from '../text';
import { highlight, splitLines, escapeHtml } from '../hl';
import { extOf } from '../detect';
import { formatJsonl, parseJsonLoose } from '../jsonl';
import { Loading, ErrorBox } from '../ui';
import { t } from '../i18n';

const MAX_BYTES = 30 << 20;        // これより大きいファイルは先頭だけ表示します
const HL_LIMIT = 1_500_000;        // これより長い文字列はハイライトしません（速度のため）
const CHUNK = 3000;                // 一度に描く行数
const JSONL_MAX_RECORDS = 2000;    // JSON Lines を整形して見せる件数の上限（残りはソース表示で）
const JSONL_MAX_CHARS = 2_000_000; // 同じく、整形する元の文字数の上限
const ENCODINGS = ['自動', 'UTF-8', 'Shift_JIS', 'EUC-JP', 'UTF-16LE', 'UTF-16BE'] as const;

function prettyXml(src: string): string | null {
  const doc = new DOMParser().parseFromString(src, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return null;
  const out: string[] = [];
  const walk = (n: Node, d: number) => {
    const pad = '  '.repeat(d);
    if (n.nodeType === 1) {
      const el = n as Element;
      const attrs = Array.from(el.attributes).map((a) => ` ${a.name}="${a.value.replace(/"/g, '&quot;')}"`).join('');
      const kids = Array.from(el.childNodes).filter((k) => !(k.nodeType === 3 && !k.textContent!.trim()));
      if (!kids.length) out.push(`${pad}<${el.tagName}${attrs}/>`);
      else if (kids.length === 1 && kids[0].nodeType === 3) out.push(`${pad}<${el.tagName}${attrs}>${kids[0].textContent!.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${el.tagName}>`);
      else { out.push(`${pad}<${el.tagName}${attrs}>`); kids.forEach((k) => walk(k, d + 1)); out.push(`${pad}</${el.tagName}>`); }
    } else if (n.nodeType === 3) out.push(pad + n.textContent!.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;'));
    else if (n.nodeType === 8) out.push(`${pad}<!--${n.textContent}-->`);
    else if (n.nodeType === 7) { const p = n as ProcessingInstruction; out.push(`${pad}<?${p.target} ${p.data}?>`); }
  };
  Array.from(doc.childNodes).forEach((n) => walk(n, 0));
  return out.join('\n');
}

/** 実行枠の中で、書かれた HTML の先頭に入れる CSP（外部通信なし） */
const RUN_CSP = "default-src 'none'; script-src 'unsafe-inline' blob: data:; style-src 'unsafe-inline' data: blob:; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'";

/**
 * HTML をスクリプトごと実行して表示します。srcdoc・blob・data の iframe は親ページの CSP を引き継いで
 * インラインスクリプトが動かないため、専用ページ /run-sandbox.html（独自の厳しい CSP）を
 * sandbox="allow-scripts" のみ（allow-same-origin なし）で開き、postMessage で中身を渡します。
 * 不透明オリジンなので親の DOM・IndexedDB・セッションには触れられず、外部への遷移も親の frame-src で止まります。
 */
function HtmlRunner({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow || e.data?.type !== 'lv-sandbox-ready') return;
      ref.current.contentWindow!.postMessage({ type: 'lv-html', html, csp: RUN_CSP }, '*');
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [html]);
  return <iframe ref={ref} className="mail-frame" style={{ width: '100%', height: '70vh', minHeight: 420, background: '#fff' }} sandbox="allow-scripts" src="/run-sandbox.html" title={t('HTML の表示')} data-testid="html-frame" />;
}

export default function TextViewer({ file }: { file: File }) {
  const ext = extOf(file.name) || file.name.toLowerCase();
  const mode: TextMode = textMode(ext);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [enc, setEnc] = useState<(typeof ENCODINGS)[number]>('自動');
  const [wrap, setWrap] = useState(mode === 'plain' || mode === 'markdown');
  const [rendered, setRendered] = useState(mode === 'markdown' || mode === 'html' || mode === 'json' || mode === 'jsonl' || mode === 'xml');
  const [limit, setLimit] = useState(CHUNK);
  const [q, setQ] = useState('');
  const [hit, setHit] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [err, setErr] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    file.slice(0, MAX_BYTES).arrayBuffer().then((b) => alive && setBytes(new Uint8Array(b))).catch(() => alive && setErr(t('ファイルを読み込めませんでした。')));
    return () => { alive = false; };
  }, [file]);

  const decoded = useMemo(() => {
    if (!bytes) return null;
    if (enc === '自動') return decodeText(bytes);
    const label = enc === 'Shift_JIS' ? 'shift_jis' : enc.toLowerCase();
    return { text: new TextDecoder(label).decode(bytes), encoding: enc };
  }, [bytes, enc]);

  // 整形（JSON / XML）
  const view = useMemo(() => {
    if (!decoded) return null;
    let text = decoded.text.replace(/\r\n?/g, '\n'); let note = ''; let lang = TEXT_LANG[ext] ?? '';
    if (rendered && mode === 'jsonl') {
      // 1 行 1 件：件ごとに整形・色付けし、元の行番号を左に出します。読めない行はその行だけ元のまま
      const r = formatJsonl(text, JSONL_MAX_RECORDS, JSONL_MAX_CHARS);
      const plain: string[] = [], html: string[] = [], lns: string[] = [], cls: string[] = [];
      for (const rec of r.records) {
        const head = plain.length;
        if (rec.pretty !== undefined) {
          const ls = rec.pretty.split('\n'); const hs = rec.pretty.length <= 200_000 ? splitLines(highlight(rec.pretty, 'json')) : ls.map(escapeHtml);
          ls.forEach((l, k) => { plain.push(l); html.push(hs[k] ?? escapeHtml(l)); lns.push(k === 0 ? String(rec.line) : ''); cls.push(''); });
        } else {
          const msg = t('{0} 行目は JSON として解釈できないため、元のまま表示しています（{1}）', rec.line.toLocaleString(), rec.error ?? '');
          plain.push(msg); html.push(escapeHtml(msg)); lns.push('!'); cls.push(' jl-err');
          plain.push(rec.raw ?? ''); html.push(escapeHtml(rec.raw ?? '')); lns.push(String(rec.line)); cls.push(' jl-raw');
        }
        if (head > 0) cls[head] += ' jl-rec';
      }
      if (r.truncated) note = file.size > MAX_BYTES
        ? t('先頭 {0} 件を整形して表示しています（読み込んだ先頭 30 MB の中に {1} 件）。残りは「ソースを表示」で見られます。', r.records.length.toLocaleString(), r.total.toLocaleString())
        : t('先頭 {0} 件を整形して表示しています（全 {1} 件）。残りは「ソースを表示」で見られます。', r.records.length.toLocaleString(), r.total.toLocaleString());
      else if (r.total === 0) note = t('JSON Lines として表示できる行がありません。');
      return { plain, html, note, hl: true, lns, cls, records: r.total, errors: r.errors, lnw: String(r.records.at(-1)?.line ?? 1).length };
    }
    if (rendered && mode === 'json') {
      try { const p = parseJsonLoose(text); text = JSON.stringify(p.value, null, 2); if (p.loose) note = t('コメントと末尾のカンマを除いて整形しています。元の書き方は「ソースを表示」で見られます。'); }
      catch (e) { note = t('JSON として解釈できないため、元のまま表示しています（{0}）', (e as Error).message); }
      lang = 'json';
    }
    if (rendered && mode === 'xml') { const p = prettyXml(text); if (p) text = p; else note = t('XML として解釈できないため、元のまま表示しています。'); lang = 'xml'; }
    const plain = text.split('\n');
    const html = text.length <= HL_LIMIT && lang ? splitLines(highlight(text, lang)) : null;
    return { plain, html, note, hl: !!html, lns: null as string[] | null, cls: null as string[] | null, records: 0, errors: 0, lnw: 0 };
  }, [decoded, rendered, mode, ext, file.size]);

  // 検索（大文字小文字は区別しません）
  const matches = useMemo(() => {
    if (!view || !q) return [] as number[];
    const n = q.toLowerCase(); const out: number[] = [];
    view.plain.forEach((l, i) => { if (l.toLowerCase().includes(n)) out.push(i); });
    return out;
  }, [view, q]);
  useEffect(() => { setHit(0); }, [q]);
  const curLine = matches.length ? matches[Math.min(hit, matches.length - 1)] : -1;
  useEffect(() => { if (curLine >= limit) setLimit(curLine + CHUNK); }, [curLine, limit]);
  useEffect(() => {
    const root = bodyRef.current; if (!root) return;
    const hl = (globalThis as unknown as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights;
    const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (curLine >= 0) root.querySelector(`[data-line="${curLine}"]`)?.scrollIntoView({ block: 'center' });
    if (!hl || !H) return;
    hl.delete('lv-find'); hl.delete('lv-cur');
    if (!q) return;
    const all: Range[] = []; const cur: Range[] = []; const n = q.toLowerCase();
    root.querySelectorAll<HTMLElement>('.lc').forEach((el) => {
      const line = Number(el.parentElement!.dataset.line);
      if (!matches.length || (all.length > 3000)) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const s = t.textContent!.toLowerCase(); let i = s.indexOf(n);
        while (i >= 0) { const r = new Range(); r.setStart(t, i); r.setEnd(t, i + n.length); (line === curLine ? cur : all).push(r); i = s.indexOf(n, i + n.length); }
      }
    });
    hl.set('lv-find', new H(...all)); hl.set('lv-cur', new H(...cur));
    return () => { hl.delete('lv-find'); hl.delete('lv-cur'); };
  }, [q, curLine, matches, limit, view, wrap]);

  // Ctrl+F（⌘F）はビューア内の検索にします
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.select(), 0); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!decoded || !view) return <Loading>{t('テキストを読み込んでいます')}</Loading>;
  const canRender = mode === 'markdown' || mode === 'html' || mode === 'json' || mode === 'jsonl' || mode === 'xml';
  const structured = mode === 'json' || mode === 'jsonl' || mode === 'xml';
  const jsonlView = rendered && mode === 'jsonl';
  const showRendered = rendered && (mode === 'markdown' || mode === 'html');
  const n = view.plain.length;

  return (
    <div className="textview">
      <div className="toolbar">
        {canRender && (
          <button aria-pressed={!rendered} onClick={() => setRendered(!rendered)} data-testid="mode-toggle">
            {rendered
              ? t('ソースを表示')
              : (structured ? t('整形して表示') : t('表示に戻す'))}
          </button>
        )}
        {!showRendered && <button aria-pressed={wrap} onClick={() => setWrap(!wrap)}>{t('折り返し')}</button>}
        {!showRendered && <button aria-pressed={showSearch} onClick={() => { setShowSearch(!showSearch); setTimeout(() => searchRef.current?.focus(), 0); }}>{t('検索')}</button>}
        <select value={enc} onChange={(e) => setEnc(e.target.value as typeof enc)} aria-label={t('文字コード')} data-testid="encoding">
          {ENCODINGS.map((x) => <option key={x} value={x}>{x === '自動' ? t('自動（{0}）', decoded.encoding) : x}</option>)}
        </select>
        <span className="mono dims" data-testid="text-info">{jsonlView ? (view.errors ? t('{0} 件・解釈できない行 {1}｜JSON Lines', view.records.toLocaleString(), view.errors.toLocaleString()) : t('{0} 件｜JSON Lines', view.records.toLocaleString())) : t('{0} 行｜テキスト', n.toLocaleString())}{file.size > MAX_BYTES ? t('（先頭 30 MB）') : ''}{!view.hl && TEXT_LANG[ext] ? t(' · 大きいためハイライトなし') : ''}</span>
      </div>
      {showSearch && !showRendered && (
        <div className="findbar">
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ファイル内を検索')} data-testid="find"
            onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) { e.preventDefault(); setHit((h) => (h + (e.shiftKey ? matches.length - 1 : 1)) % matches.length); } if (e.key === 'Escape') { setShowSearch(false); setQ(''); } }} />
          <span className="mono" data-testid="find-count">{q ? (matches.length ? t('{0} / {1} 行｜検索', Math.min(hit, matches.length - 1) + 1, matches.length) : t('見つかりません')) : ''}</span>
          <button onClick={() => matches.length && setHit((h) => (h + matches.length - 1) % matches.length)} aria-label={t('前へ')}>↑</button>
          <button onClick={() => matches.length && setHit((h) => (h + 1) % matches.length)} aria-label={t('次へ')}>↓</button>
        </div>
      )}
      {decoded.text.length > 0 && decoded.text.trim() === '' && <p className="hint" data-testid="blank-note">{t('空白・改行だけのファイルです（{0} 文字）。', decoded.text.length)}</p>}
      {view.note && <p className="hint">{view.note}</p>}
      {showRendered && mode === 'markdown' && <div className="md" data-testid="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(decoded.text) }} />}
      {showRendered && mode === 'html' && (
        <>
          <p className="hint">{t('HTML はスクリプトも動かして表示します。外部との通信や、このページ・保存中のファイルへのアクセスはできない隔離された枠の中で実行します。')}</p>
          <HtmlRunner html={decoded.text} />
        </>
      )}
      {!showRendered && (
        <div ref={bodyRef} className={'code hljs' + (wrap ? ' wrap' : '')} data-testid="code" data-view={jsonlView ? 'jsonl' : undefined} style={{ ['--lnw' as string]: `${(view.lnw || String(n).length) + 1}ch` }}>
          {view.plain.slice(0, limit).map((l, i) => (
            <div key={i} className={'row' + (view.cls ? view.cls[i] : '') + (i === curLine ? ' cur' : '')} data-line={i}>
              <span className="ln">{view.lns ? view.lns[i] : i + 1}</span>
              {view.html ? <span className="lc" dangerouslySetInnerHTML={{ __html: view.html[i] || ' ' }} /> : <span className="lc">{l || ' '}</span>}
            </div>
          ))}
          {n > limit && <button className="more" onClick={() => setLimit((x) => x + CHUNK * 3)}>{t('続きを表示（残り {0} 行）', (n - limit).toLocaleString())}</button>}
        </div>
      )}
    </div>
  );
}
export { escapeHtml };
