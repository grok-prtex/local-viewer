import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { detectFormat, extOf, FORMATS, formatInfo, type FormatKind } from './detect';
import { Loading, ErrorBox } from './ui';
import { size } from './viewers/Mail';
import { loadSession, saveSession, clearSession, touchSession } from './session';

const PdfViewer = lazy(() => import('./viewers/PdfViewer'));
const EmlViewer = lazy(() => import('./viewers/EmlViewer'));
const MsgViewer = lazy(() => import('./viewers/MsgViewer'));
const CadViewer = lazy(() => import('./viewers/CadViewer'));
const DxfViewer = lazy(() => import('./viewers/DxfViewer'));
const SheetViewer = lazy(() => import('./viewers/SheetViewer'));
const DocxViewer = lazy(() => import('./viewers/DocxViewer'));
const ZipViewer = lazy(() => import('./viewers/ZipViewer'));
const ImageViewer = lazy(() => import('./viewers/ImageViewer'));
const MediaViewer = lazy(() => import('./viewers/MediaViewer'));
const CadInfoViewer = lazy(() => import('./viewers/CadInfoViewer'));
const TextViewer = lazy(() => import('./viewers/TextViewer'));
const SqlViewer = lazy(() => import('./viewers/SqlViewer'));
const JoblibViewer = lazy(() => import('./viewers/JoblibViewer'));

interface Opened { file: File; kind: FormatKind; }
const GROUPS = ['Office', 'Mail', 'CAD', 'Image', 'Media', 'Archive', 'Text'] as const;
const isReady = (k: FormatKind) => FORMATS.some((f) => f.kind === k && f.ready);

export default function App() {
  const [stack, setStack] = useState<Opened[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = stack[stack.length - 1];
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const files = await loadSession();
        const opened: Opened[] = [];
        for (const file of files) {
          const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
          opened.push({ file, kind: detectFormat(file.name, head) });
        }
        if (opened.length) setStack(opened);
      } catch { /* IndexedDB が使えない環境では復元しません */ }
      setRestored(true);
    })();
    const t = setInterval(() => { touchSession().catch(() => {}); }, 15_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (restored) saveSession(stack.map((o) => o.file)).catch(() => {}); }, [stack, restored]);
  const wipe = () => { setStack([]); clearSession().catch(() => {}); };

  const open = useCallback(async (file: File, replace: boolean) => {
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const o = { file, kind: detectFormat(file.name, head) };
    setStack((s) => (replace ? [o] : [...s, o]));
    window.scrollTo(0, 0);
  }, []);
  const openChild = useCallback((f: File) => open(f, false), [open]);
  const canOpen = useCallback((n: string, d: Uint8Array) => isReady(detectFormat(n, d.subarray(0, 1024))), []);
  const canOpenName = useCallback((n: string) => isReady(detectFormat(n, new Uint8Array())), []);

  useEffect(() => {
    const over = (e: DragEvent) => { e.preventDefault(); setDrag(true); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setDrag(false); };
    const drop = (e: DragEvent) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) open(f, true); };
    window.addEventListener('dragover', over); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, [open]);

  const picker = (
    <input ref={input} type="file" hidden data-testid="file-input"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f, true); e.target.value = ''; }} />
  );

  return (
    <div className={'app' + (drag ? ' dragging' : '')}>
      <header className="top">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); setStack([]); }}>
          <span className="mono code">VWR-001</span>
          <span className="title">なんでもローカルビューア</span>
        </a>
        <div className="privacy-wrap">
          <p className="privacy"><span className="dot" aria-hidden />ファイルはPCから外部送信されません／すべてブラウザ内で処理されます</p>
          <p className="privacy-sub">開いたファイルはこのタブを閉じるまでブラウザ内に一時的に残ります（外部送信はしません）</p>
        </div>
      </header>
      {picker}
      <main>
        {!restored ? <Loading>準備しています</Loading> : !current ? (
          <>
            <section className={'drop' + (drag ? ' over' : '')} onClick={() => input.current?.click()} data-testid="drop-zone"
              role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}>
              <div className="drop-title">ファイルをここにドロップしてください</div>
              <div className="drop-sub">または <span className="link">ファイルを選択</span> します</div>
              <div className="drop-note">「このファイル、開けない」と思ったら、まずここに入れてみてください。</div>
            </section>
            <section className="formats">
              <h2>対応形式</h2>
              <div className="groups">
                {GROUPS.map((g) => (
                  <div className="group" key={g}>
                    <div className="label mono">{g.toUpperCase()}</div>
                    <ul>
                      {FORMATS.filter((f) => f.group === g).map((f) => (
                        <li key={f.label} className={f.ready ? '' : 'pending'}>
                          <span className="fmt">{f.label}</span>
                          <span className="mono exts">{f.exts.map((x) => '.' + x).join(' ')}</span>
                          {!f.ready && <span className="badge">準備中</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
            <section className="about">
              <h2>しくみ</h2>
              <p>読み込んだファイルは、お使いのブラウザの中だけで解析して表示します。サーバーへのアップロードや通信は一切行いません。再読み込みしても表示が消えないよう、開いたファイルはこのタブを閉じるまでブラウザ内（IndexedDB）に一時的に残します。「閉じる／消去」を押すと、すぐに消去します。</p>
              <p>通信の制限はブラウザのセキュリティ設定（Content-Security-Policy）でも強制しているため、万一の不具合があってもファイルの内容が外部へ送られることはありません。</p>
            </section>
          </>
        ) : (
          <section className="viewer">
            <div className="viewer-head">
              <div className="crumbs">
                {stack.length > 1 && <button className="ghost" onClick={() => setStack((s) => s.slice(0, -1))}>戻る</button>}
                <div>
                  <div className="fname" data-testid="file-name">{current.file.name}</div>
                  <div className="mono meta">{(['image', 'video', 'audio'].includes(current.kind) ? null : formatInfo(current.kind)?.label) ?? (extOf(current.file.name).toUpperCase() || '不明な形式')} · {size(current.file.size)}</div>
                </div>
              </div>
              <div className="head-actions">
                <button onClick={() => input.current?.click()}>別のファイルを開く</button>
                <button className="ghost" onClick={wipe} data-testid="clear">閉じる／消去</button>
              </div>
            </div>
            <div className="viewer-body" key={stack.length + current.file.name}>
              <Suspense fallback={<Loading>表示の準備をしています</Loading>}>
                <Viewer o={current} openChild={openChild} canOpen={canOpen} canOpenName={canOpenName} />
              </Suspense>
            </div>
          </section>
        )}
      </main>
      <footer className="foot">
        <span>a-ef · ユーティリティを、すぐに。</span>
        <span>表示のみの道具です。編集・変換・保存の機能はありません。</span>
        <span className="source">
          <a href="https://github.com/grok-prtex/local-viewer" target="_blank" rel="noopener noreferrer" data-testid="source-link">ソースコード（GitHub）</a>
          {' · '}
          <a className="mono" href={`https://github.com/grok-prtex/local-viewer/commit/${__COMMIT__.replace('-dirty', '')}`} target="_blank" rel="noopener noreferrer" data-testid="commit">{__COMMIT__}</a>
        </span>
      </footer>
    </div>
  );
}

function Viewer({ o, openChild, canOpen, canOpenName }: { o: Opened; openChild: (f: File) => void; canOpen: (n: string, d: Uint8Array) => boolean; canOpenName: (n: string) => boolean }) {
  const { file, kind } = o;
  switch (kind) {
    case 'pdf': return <PdfViewer file={file} />;
    case 'eml': return <EmlViewer file={file} onOpen={openChild} canOpen={canOpen} />;
    case 'msg': return <MsgViewer file={file} onOpen={openChild} canOpen={canOpen} />;
    case 'stl': case 'step': case 'iges': case 'u3d': return <CadViewer file={file} kind={kind} />;
    case 'dxf': return <DxfViewer file={file} />;
    case 'sheet': return <SheetViewer file={file} xls={/\.xls$/i.test(file.name) && !/\.xlsx$/i.test(file.name)} />;
    case 'csv': return <SheetViewer file={file} csv />;
    case 'docx': return <DocxViewer file={file} />;
    case 'image': return <ImageViewer file={file} />;
    case 'video': case 'audio': return <MediaViewer file={file} kind={kind} />;
    case 'text': return <TextViewer file={file} />;
    case 'sqlite': return <SqlViewer file={file} />;
    case 'joblib': return <JoblibViewer file={file} />;
    case 'access': return <ErrorBox>Access（MDB / ACCDB）の表示は準備中です。もうしばらくお待ちください。</ErrorBox>;
    case 'parasolid': case 'sw': return <CadInfoViewer file={file} kind={kind} />;
    case 'zip': return <ZipViewer file={file} onOpen={openChild} canOpenName={canOpenName} />;
    case 'pptx': return <ErrorBox>PowerPoint（PPTX）の表示は準備中です。もうしばらくお待ちください。</ErrorBox>;
    case 'dwg': return <ErrorBox>DWG の表示は準備中です。CAD ソフトで DXF に書き出すと、ここで表示できます。</ErrorBox>;
    default: return <ErrorBox>この形式のファイルには、まだ対応していません。対応形式の一覧をご確認ください。</ErrorBox>;
  }
}
