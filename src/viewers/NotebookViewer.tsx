import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { parseNotebook, type NbCell, type NbOutput, type Notebook } from '../notebook';
import { highlight, escapeHtml } from '../hl';
import { renderMarkdown, sanitizeHtml } from '../markdown';
import { decodeText } from '../text';
import { ErrorBox, Loading } from '../ui';
import { t } from '../i18n';

const TextViewer = lazy(() => import('./TextViewer'));

function Output({ o }: { o: NbOutput }) {
  switch (o.kind) {
    case 'stream': return <pre className={'nb-out nb-stream' + (o.name === 'stderr' ? ' nb-stderr' : '')}>{o.text}</pre>;
    case 'error': return <pre className="nb-out nb-error" data-testid="nb-error">{o.traceback || `${o.ename}: ${o.evalue}`}</pre>;
    case 'image': return <div className="nb-out nb-img"><img src={o.src} alt={t('出力画像')} data-testid="nb-img" /></div>;
    case 'html': return <div className="nb-out nb-html md" data-testid="nb-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(o.html) }} />;
    case 'markdown': return <div className="nb-out md" dangerouslySetInnerHTML={{ __html: renderMarkdown(o.text) }} />;
    default: return <pre className="nb-out">{o.text}</pre>;
  }
}

function Cell({ c, hl }: { c: NbCell; hl: string }) {
  if (c.type === 'markdown') return <div className="nb-cell nb-md"><div className="nb-prompt" /><div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.source) }} /></div>;
  if (c.type === 'raw') return <div className="nb-cell"><div className="nb-prompt" /><pre className="nb-raw">{c.source}</pre></div>;
  const n = c.count == null ? '\u00a0' : String(c.count);
  return (
    <div className="nb-cell nb-code" data-testid="nb-code">
      <div className="nb-prompt mono">In&nbsp;[{n}]:</div>
      <pre className="nb-src code hl"><code dangerouslySetInnerHTML={{ __html: c.source.length < 200_000 ? highlight(c.source, hl) : escapeHtml(c.source) }} /></pre>
      {c.outputs.length > 0 && <>
        <div className="nb-prompt mono nb-outp">{c.outputs.some((o) => o.kind !== 'stream') && c.count != null ? `Out[${n}]:` : ''}</div>
        <div className="nb-outs">{c.outputs.map((o, i) => <Output key={i} o={o} />)}</div>
      </>}
    </div>
  );
}

export default function NotebookViewer({ file }: { file: File }) {
  const [nb, setNb] = useState<Notebook | null>(null);
  const [err, setErr] = useState('');
  const [json, setJson] = useState(false);
  useEffect(() => {
    let alive = true;
    file.arrayBuffer().then((b) => { const nb2 = parseNotebook(decodeText(new Uint8Array(b)).text); if (alive) setNb(nb2); })
      .catch(() => alive && setErr(t('ノートブックを読み込めませんでした。JSON として正しくない可能性があります。')));
    return () => { alive = false; };
  }, [file]);
  const jsonFile = useMemo(() => new File([file], file.name.replace(/\.ipynb$/i, '') + '.json', { type: 'application/json' }), [file]);
  const toggle = <button onClick={() => setJson(!json)} data-testid="nb-toggle">{json ? t('ノートブック表示') : t('JSON で表示')}</button>;
  if (err) return <div><div className="toolbar">{toggle}</div>{json ? <Suspense fallback={<Loading>{t('準備しています')}</Loading>}><TextViewer file={jsonFile} /></Suspense> : <ErrorBox>{err}</ErrorBox>}</div>;
  if (!nb) return <Loading>{t('ノートブックを読み込んでいます')}</Loading>;
  return (
    <div className="nb" data-testid="notebook">
      <div className="toolbar">
        {toggle}
        <span className="hint-inline">{t('セル {0} 個 · 言語 {1} · コードは実行しません', nb.cells.length, nb.lang)}</span>
      </div>
      {json
        ? <Suspense fallback={<Loading>{t('準備しています')}</Loading>}><TextViewer file={jsonFile} /></Suspense>
        : <div className="nb-cells">{nb.cells.map((c, i) => <Cell key={i} c={c} hl={nb.hlLang} />)}</div>}
    </div>
  );
}
