import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { detectFormat, extOf, FORMATS, formatInfo, type FormatKind } from './detect';
import { Loading, ErrorBox } from './ui';
import { size } from './viewers/Mail';

const PdfViewer = lazy(() => import('./viewers/PdfViewer'));
const EmlViewer = lazy(() => import('./viewers/EmlViewer'));
const MsgViewer = lazy(() => import('./viewers/MsgViewer'));
const CadViewer = lazy(() => import('./viewers/CadViewer'));
const DxfViewer = lazy(() => import('./viewers/DxfViewer'));
const SheetViewer = lazy(() => import('./viewers/SheetViewer'));
const DocxViewer = lazy(() => import('./viewers/DocxViewer'));
const ZipViewer = lazy(() => import('./viewers/ZipViewer'));

interface Opened { file: File; kind: FormatKind; }
const GROUPS = ['Office', 'Mail', 'CAD', 'Archive'] as const;
const isReady = (k: FormatKind) => !!formatInfo(k)?.ready;

export default function App() {
  const [stack, setStack] = useState<Opened[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = stack[stack.length - 1];

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
        <p className="privacy"><span className="dot" aria-hidden />ファイルはPCから外部送信されません／すべてブラウザ内で処理されます</p>
      </header>
      {picker}
      <main>
        {!current ? (
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
                        <li key={f.kind} className={f.ready ? '' : 'pending'}>
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
              <p>読み込んだファイルは、お使いのブラウザの中だけで解析して表示します。サーバーへのアップロード、通信、保存は一切行いません。ページを閉じると、ファイルの内容はブラウザからも消えます。</p>
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
                  <div className="mono meta">{formatInfo(current.kind)?.label ?? (extOf(current.file.name).toUpperCase() || '不明な形式')} · {size(current.file.size)}</div>
                </div>
              </div>
              <button onClick={() => input.current?.click()}>別のファイルを開く</button>
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
    case 'stl': case 'step': case 'iges': return <CadViewer file={file} kind={kind} />;
    case 'dxf': return <DxfViewer file={file} />;
    case 'sheet': return <SheetViewer file={file} />;
    case 'csv': return <SheetViewer file={file} csv />;
    case 'docx': return <DocxViewer file={file} />;
    case 'zip': return <ZipViewer file={file} onOpen={openChild} canOpenName={canOpenName} />;
    case 'pptx': return <ErrorBox>PowerPoint（PPTX）の表示は準備中です。もうしばらくお待ちください。</ErrorBox>;
    case 'dwg': return <ErrorBox>DWG の表示は準備中です。CAD ソフトで DXF に書き出すと、ここで表示できます。</ErrorBox>;
    default: return <ErrorBox>この形式のファイルには、まだ対応していません。対応形式の一覧をご確認ください。</ErrorBox>;
  }
}
