import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { lazy, Suspense } from 'react';
import { Loading, ErrorBox } from '../ui';
import { extract3D, type Pdf3D } from '../pdf3d';
const Pdf3DView = lazy(() => import('./Pdf3DView'));

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfViewer({ file }: { file: File }) {
  const host = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState('');
  const [model, setModel] = useState<Pdf3D | null>(null);
  const [mode, setMode] = useState<'pages' | '3d'>('pages');

  useEffect(() => {
    let alive = true; let d: pdfjs.PDFDocumentProxy | null = null;
    file.arrayBuffer().then((buf) => {
      extract3D(new Uint8Array(buf.slice(0))).then((m) => { if (alive && m) { setModel(m); setMode(m.kind === 'U3D' ? '3d' : 'pages'); } }).catch(() => {});
      return buf;
    }).then((buf) => pdfjs.getDocument({
      data: new Uint8Array(buf),
      cMapUrl: '/vendor/pdfjs/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/vendor/pdfjs/standard_fonts/',
      wasmUrl: '/vendor/pdfjs/wasm/', iccUrl: '/vendor/pdfjs/iccs/',
      enableXfa: false,
    }).promise).then((p) => { d = p; if (alive) setDoc(p); })
      .catch((e) => alive && setErr(e?.name === 'PasswordException'
        ? 'パスワード付きの PDF は、現在は開けません。'
        : 'PDF を読み込めませんでした。ファイルが壊れている可能性があります。'));
    return () => { alive = false; d?.cleanup(); };
  }, [file]);

  useEffect(() => {
    if (!doc || mode !== 'pages') return;
    const el = host.current!; el.innerHTML = '';
    let cancelled = false;
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
    })();
    return () => { cancelled = true; io.disconnect(); };
  }, [doc, zoom, mode]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!doc) return <Loading>PDF を読み込んでいます</Loading>;
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
        <button onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}>縮小</button>
        <span className="mono">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(5, z * 1.25))}>拡大</button>
        <button onClick={() => setZoom(1)}>幅に合わせる</button>
      </div>
      <div className="pdf-pages" ref={host} data-testid="pdf-pages" />
    </div>
  );
}
