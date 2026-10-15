import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { lazy, Suspense } from 'react';
import { Loading, ErrorBox } from '../ui';
import { attachZoomGestures } from '../gesture';
import { Progress, readWithProgress, type ProgressState } from '../progress';
import { extract3D, type Pdf3D } from '../pdf3d';
const Pdf3DView = lazy(() => import('./Pdf3DView'));

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfViewer({ file }: { file: File }) {
  const host = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1); zoomRef.current = zoom;
  const [err, setErr] = useState('');
  const [model, setModel] = useState<Pdf3D | null>(null);
  const [mode, setMode] = useState<'pages' | '3d'>('pages');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ['読み込み中', '解析中', '描画中'] });
  const [rendered, setRendered] = useState(0);

  useEffect(() => {
    let alive = true; let d: pdfjs.PDFDocumentProxy | null = null;
    const st = ['読み込み中', '解析中', '描画中'] as const;
    readWithProgress(file, (pct) => alive && setProg({ stage: '読み込み中', pct, stages: st })).then((buf) => {
      if (alive) setProg({ stage: '解析中', stages: st });
      extract3D(new Uint8Array(buf.slice(0))).then((m) => { if (alive && m) { setModel(m); setMode(m.kind === 'U3D' ? '3d' : 'pages'); } }).catch(() => {});
      return buf;
    }).then((buf) => { const t = pdfjs.getDocument({
      data: new Uint8Array(buf),
      cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
      wasmUrl: '/vendor/pdfjs/wasm/', iccUrl: '/vendor/pdfjs/iccs/',
      enableXfa: false,
    }); t.onProgress = ({ loaded, total }: { loaded: number; total: number }) => { if (alive && total) setProg({ stage: '解析中', pct: (loaded / total) * 100, stages: st }); }; return t.promise; }).then((p) => { d = p; if (alive) setDoc(p); })
      .catch((e) => alive && setErr(e?.name === 'PasswordException'
        ? 'パスワード付きの PDF は、現在は開けません。'
        : 'PDF を読み込めませんでした。ファイルが壊れている可能性があります。'));
    return () => { alive = false; d?.cleanup(); };
  }, [file]);

  useEffect(() => {
    if (!doc || mode !== 'pages') return;
    const el = host.current!;
    const keep = { l: el.scrollLeft, t: el.scrollTop };
    el.innerHTML = '';
    let cancelled = false; setRendered(0);
    const width = Math.min(el.clientWidth || 800, 1000);
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const c = en.target as HTMLCanvasElement; io.unobserve(c);
        renderPage(c, Number(c.dataset.page));
      }
    }, { rootMargin: '600px' });
    const renderPage = async (canvas: HTMLCanvasElement, n: number) => {
      const page = await doc.getPage(n);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const scale = (width / base.width) * zoom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: scale * dpr });
      canvas.width = vp.width; canvas.height = vp.height;
      canvas.style.width = vp.width / dpr + 'px'; canvas.style.height = vp.height / dpr + 'px';
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      canvas.dataset.rendered = 'true';
      if (!cancelled) setRendered((r) => r + 1);
    };
    (async () => {
      for (let n = 1; n <= doc.numPages; n++) {
        const p = await doc.getPage(n);
        if (cancelled) return;
        const v = p.getViewport({ scale: (width / p.getViewport({ scale: 1 }).width) * zoom });
        const c = document.createElement('canvas');
        c.className = 'pdf-page'; c.dataset.page = String(n);
        c.style.width = v.width + 'px'; c.style.height = v.height + 'px';
        el.appendChild(c); io.observe(c);
      }
      el.scrollLeft = keep.l; el.scrollTop = keep.t;
    })();
    return () => { cancelled = true; io.disconnect(); };
  }, [doc, zoom, mode]);

  // Ctrl+ホイール／ピンチ：まず CSS で見た目だけ拡大し、止まってから新しい倍率で描き直します（くっきり表示）
  const live = useRef({ k: 1, t: 0 as unknown as ReturnType<typeof setTimeout> });
  useEffect(() => {
    const el = host.current; if (!el || !doc || mode !== 'pages') return;
    const off = attachZoomGestures(el, {
      zoom: (f0, cx, cy) => {
        const L = live.current;
        const zNow = zoomRef.current * L.k;
        const f = Math.max(0.25, Math.min(5, zNow * f0)) / zNow;
        if (f === 1) return;
        L.k *= f;
        const px = el.scrollLeft + cx, py = el.scrollTop + cy;
        el.querySelectorAll<HTMLCanvasElement>('canvas.pdf-page').forEach((c) => {
          const w = parseFloat(c.style.width), h = parseFloat(c.style.height);
          c.style.width = w * f + 'px'; c.style.height = h * f + 'px';
        });
        el.scrollLeft = px * f - cx; el.scrollTop = py * f - cy;
        clearTimeout(L.t);
        L.t = setTimeout(() => { const k = L.k; L.k = 1; setZoom((z) => Math.max(0.25, Math.min(5, z * k))); }, 250);
      },
      pan: (dx, dy) => { el.scrollLeft -= dx; el.scrollTop -= dy; },
    });
    return () => { off(); clearTimeout(live.current.t); };
  }, [doc, mode]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!doc) return <Progress p={prog} />;
  const switcher = model && (
    <div className="pdf3d-bar">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'pages'} onClick={() => setMode('pages')}>PDF ページ</button>
        <button role="tab" aria-selected={mode === '3d'} onClick={() => setMode('3d')} data-testid="tab-3d">3D モデル</button>
      </div>
      <span className="hint-inline">{model.kind === 'U3D' ? 'この PDF には 3D モデル（U3D 形式）が含まれています。' : 'この3DPDF（PRC形式）はまだ未対応です。ページは表示できます。'}</span>
    </div>
  );
  if (model && mode === '3d') return (
    <div>{switcher}<Suspense fallback={<Loading>表示の準備をしています</Loading>}><Pdf3DView model={model} /></Suspense></div>
  );
  return (
    <div>
      {switcher}
      <div className="toolbar">
        <span className="mono">{doc.numPages} ページ</span>
        {rendered < Math.min(doc.numPages, 1) ? <span className="mono" data-testid="pdf-render">描画中…</span> : <span className="mono hint" data-testid="pdf-render">描画済み {rendered} / {doc.numPages}</span>}
        <button onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}>縮小</button>
        <span className="mono">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z * 1.25))}>拡大</button>
        <button onClick={() => setZoom(1)}>幅に合わせる</button>
      </div>
      <div className="pdf-pages" ref={host} data-testid="pdf-pages" />
    </div>
  );
}
