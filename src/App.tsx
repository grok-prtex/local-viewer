import Prefs from './Prefs';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { detectFormat, extOf, FORMATS, formatInfo, type FormatKind } from './detect';
import { Loading, ErrorBox } from './ui';
import { size } from './viewers/Mail';
import { loadSession, saveSession, clearSession, touchSession } from './session';
import { t, useLang } from './i18n';

const PdfViewer = lazy(() => import('./viewers/PdfViewer'));
const EmlViewer = lazy(() => import('./viewers/EmlViewer'));
const MsgViewer = lazy(() => import('./viewers/MsgViewer'));
const CadViewer = lazy(() => import('./viewers/CadViewer'));
const DxfViewer = lazy(() => import('./viewers/DxfViewer'));
const SheetViewer = lazy(() => import('./viewers/SheetViewer'));
const ZipViewer = lazy(() => import('./viewers/ZipViewer'));
const ImageViewer = lazy(() => import('./viewers/ImageViewer'));
const MediaViewer = lazy(() => import('./viewers/MediaViewer'));
const TextViewer = lazy(() => import('./viewers/TextViewer'));
const SqlViewer = lazy(() => import('./viewers/SqlViewer'));
const JoblibViewer = lazy(() => import('./viewers/JoblibViewer'));
const AccessViewer = lazy(() => import('./viewers/AccessViewer'));
const NotebookViewer = lazy(() => import('./viewers/NotebookViewer'));
const ModelViewer = lazy(() => import('./viewers/ModelViewer'));
const ArchiveViewer = lazy(() => import('./viewers/ArchiveViewer'));
const ParquetViewer = lazy(() => import('./viewers/ParquetViewer'));
const MboxViewer = lazy(() => import('./viewers/MboxViewer'));
const FontViewer = lazy(() => import('./viewers/FontViewer'));

/** siblings: 一緒に選ばれたファイル（OBJ の .mtl・テクスチャ、glTF の .bin・画像など） */
interface Opened { file: File; kind: FormatKind; siblings?: File[]; }
const GROUPS = ['Office', 'Mail', 'CAD', 'Image', 'Media', 'Archive', 'Font', 'Text', 'Code'] as const;
/** 複数ファイルを一度に選んだとき、主に表示するファイル（3D モデル本体を優先） */
function mainFile(files: File[]): File {
  const rank = (f: File) => { const e = extOf(f.name); return e === 'gltf' || e === 'glb' ? 0 : e === 'obj' ? 1 : e === '3mf' || e === 'ply' || e === 'stl' ? 2 : 9; };
  return [...files].sort((a, b) => rank(a) - rank(b))[0];
}
const isReady = (k: FormatKind) => FORMATS.some((f) => f.kind === k && f.ready);

export default function App() {
  const lang = useLang();
  const [stack, setStack] = useState<Opened[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = stack[stack.length - 1];
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const items = await loadSession();
        const opened: Opened[] = [];
        for (const { file, siblings } of items) {
          const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
          opened.push({ file, kind: detectFormat(file.name, head), siblings });
        }
        if (opened.length) setStack(opened);
      } catch { /* IndexedDB が使えない環境では復元しません */ }
      setRestored(true);
    })();
    const t = setInterval(() => { touchSession().catch(() => {}); }, 15_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (restored) saveSession(stack.map((o) => ({ file: o.file, siblings: o.siblings }))).catch(() => {}); }, [stack, restored]);
  const wipe = () => { setStack([]); clearSession().catch(() => {}); };

  const open = useCallback(async (file: File, replace: boolean, siblings?: File[]) => {
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const o: Opened = { file, kind: detectFormat(file.name, head), siblings: siblings?.filter((f) => f !== file) };
    setStack((s) => (replace ? [o] : [...s, o]));
    window.scrollTo(0, 0);
  }, []);
  const openChild = useCallback((f: File, siblings?: File[]) => open(f, false, siblings), [open]);
  const openList = useCallback((list: FileList | null | undefined) => {
    const fs = list ? Array.from(list) : []; if (!fs.length) return;
    const main = mainFile(fs); open(main, true, fs.length > 1 ? fs : undefined);
  }, [open]);
  const canOpen = useCallback((n: string, d: Uint8Array) => isReady(detectFormat(n, d.subarray(0, 1024))), []);
  const canOpenName = useCallback((n: string) => isReady(detectFormat(n, new Uint8Array())), []);

  useEffect(() => {
    const over = (e: DragEvent) => { e.preventDefault(); setDrag(true); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setDrag(false); };
    const drop = (e: DragEvent) => { e.preventDefault(); setDrag(false); openList(e.dataTransfer?.files); };
    window.addEventListener('dragover', over); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, [openList]);

  const picker = (
    <input ref={input} type="file" hidden multiple data-testid="file-input"
      onChange={(e) => { openList(e.target.files); e.target.value = ''; }} />
  );

  return (
    <div className={'app' + (drag ? ' dragging' : '')}>
      <header className="top">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); setStack([]); }}>
          <span className="mono code">VWR-001</span>
          <span className="title">{t('なんでもローカルビューア')}</span>
        </a>
        <div className="privacy-wrap">
          <p className="privacy"><span className="dot" aria-hidden />{t('ファイルはPCから外部送信されません／すべてブラウザ内で処理されます')}</p>
          <p className="privacy-sub">{t('開いたファイルはこのタブを閉じるまでブラウザ内に一時的に残ります（外部送信はしません）')}</p>
        </div>
        <Prefs />
      </header>
      {picker}
      <main key={lang}>
        {!restored ? <Loading>{t('準備しています')}</Loading> : !current ? (
          <>
            <section className={'drop' + (drag ? ' over' : '')} onClick={() => input.current?.click()} data-testid="drop-zone"
              role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}>
              <div className="drop-title">{t('ファイルをここにドロップしてください')}</div>
              <div className="drop-sub">{t('または')} <span className="link">{t('ファイルを選択')}</span>{t('します') && ' ' + t('します')}</div>
              <div className="drop-note">{t('「このファイル、開けない」と思ったら、まずここに入れてみてください。')}</div>
            </section>
            <section className="formats">
              <h2>{t('対応形式')}</h2>
              <div className="groups">
                {GROUPS.map((g) => (
                  <div className="group" key={g}>
                    <div className="label mono" data-group={g}>{g === 'Code' ? t('プログラム') : g === 'Font' ? t('フォント') : g.toUpperCase()}</div>
                    <ul>
                      {FORMATS.filter((f) => f.group === g).map((f) => (
                        <li key={f.label} className={f.ready ? '' : 'pending'}>
                          <span className="fmt">{t(f.label)}</span>
                          <span className="mono exts">{f.exts.map((x) => '.' + x).join(' ')}</span>
                          {!f.ready && <span className="badge">{t('準備中')}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
            <section className="about">
              <h2>{t('しくみ')}</h2>
              <p>{t('読み込んだファイルは、お使いのブラウザの中だけで解析して表示します。サーバーへのアップロードや通信は一切行いません。再読み込みしても表示が消えないよう、開いたファイルはこのタブを閉じるまでブラウザ内（IndexedDB）に一時的に残します。「閉じる／消去」を押すと、すぐに消去します。')}</p>
              <p>{t('通信の制限はブラウザのセキュリティ設定（Content-Security-Policy）でも強制しているため、万一の不具合があってもファイルの内容が外部へ送られることはありません。')}</p>
            </section>
          </>
        ) : (
          <section className="viewer">
            <div className="viewer-head">
              <div className="crumbs">
                {stack.length > 1 && <button className="ghost" data-testid="back" onClick={() => setStack((s) => s.slice(0, -1))}>{t('戻る')}</button>}
                <div>
                  <div className="fname" data-testid="file-name">{current.file.name}</div>
                  <div className="mono meta">{(['image', 'video', 'audio'].includes(current.kind) ? null : (formatInfo(current.kind, extOf(current.file.name)) ? t(formatInfo(current.kind, extOf(current.file.name))!.label) : null)) ?? (extOf(current.file.name).toUpperCase() || t('不明な形式'))} · {size(current.file.size)}</div>
                </div>
              </div>
              <div className="head-actions">
                <button onClick={() => input.current?.click()}>{t('別のファイルを開く')}</button>
                <button className="ghost" onClick={wipe} data-testid="clear">{t('閉じる／消去')}</button>
              </div>
            </div>
            <div className="viewer-body" key={stack.length + current.file.name}>
              <Suspense fallback={<Loading>{t('表示の準備をしています')}</Loading>}>
                <Viewer o={current} openChild={openChild} canOpen={canOpen} canOpenName={canOpenName} />
              </Suspense>
            </div>
          </section>
        )}
      </main>
      <footer className="foot">
        <span>{t('a-ef · ユーティリティを、すぐに。')}</span>
        <span>{t('表示のみの道具です。編集・変換・保存の機能はありません。')}</span>
        <span className="source">
          <a href="https://github.com/grok-prtex/local-viewer" target="_blank" rel="noopener noreferrer" data-testid="source-link">{t('ソースコード（GitHub）')}</a>
          {' · '}
          <a className="mono" href={`https://github.com/grok-prtex/local-viewer/commit/${__COMMIT__.replace('-dirty', '')}`} target="_blank" rel="noopener noreferrer" data-testid="commit">{__COMMIT__}</a>
        </span>
      </footer>
    </div>
  );
}

function EmptyFile({ file }: { file: File }) {
  const ext = extOf(file.name);
  return (
    <div className="empty-file" role="status" data-testid="empty-file">
      <div className="empty-icon mono" aria-hidden>0 B</div>
      <div>
        <p className="empty-title">{t('中身が空のファイルです')}</p>
        <dl className="empty-meta mono">
          <dt>{t('ファイル名')}</dt><dd>{file.name}</dd>
          <dt>{t('拡張子')}</dt><dd>{ext ? '.' + ext : t('なし')}</dd>
          <dt>{t('サイズ')}</dt><dd>{t('0 バイト')}</dd>
        </dl>
        <p className="hint">{t('表示できる内容がありません。保存や書き出しが途中で止まった可能性があります。')}</p>
      </div>
    </div>
  );
}

function Viewer({ o, openChild, canOpen, canOpenName }: { o: Opened; openChild: (f: File, siblings?: File[]) => void; canOpen: (n: string, d: Uint8Array) => boolean; canOpenName: (n: string) => boolean }) {
  const { file, kind } = o;
  // 0 バイトはどの形式でも解析せず、空ファイルとして案内します
  if (file.size === 0) return <EmptyFile file={file} />;
  switch (kind) {
    case 'pdf': return <PdfViewer file={file} />;
    case 'eml': return <EmlViewer file={file} onOpen={openChild} canOpen={canOpen} />;
    case 'msg': return <MsgViewer file={file} onOpen={openChild} canOpen={canOpen} />;
    case 'stl': case 'step': case 'iges': case 'u3d': return <CadViewer file={file} kind={kind} />;
    case 'dxf': return <DxfViewer file={file} />;
    case 'csv': return <SheetViewer file={file} csv />;
    case 'sheet': return <ErrorBox>{t('Excel（XLSX / XLS）の表示は準備中です。CSV に書き出すか、PDF で受け取ると、ここで表示できます。')}</ErrorBox>;
    case 'docx': return <ErrorBox>{t('Word（DOCX）の表示は準備中です。PDF に書き出すと、ここで表示できます。')}</ErrorBox>;
    case 'image': return <ImageViewer file={file} />;
    case 'video': case 'audio': return <MediaViewer file={file} kind={kind} />;
    case 'text': return <TextViewer file={file} />;
    case 'ipynb': return <NotebookViewer file={file} />;
    case 'sqlite': return <SqlViewer file={file} />;
    case 'joblib': return <JoblibViewer file={file} />;
    case 'access': return <AccessViewer file={file} />;
    case 'zip': return <ZipViewer file={file} onOpen={openChild} canOpenName={canOpenName} />;
    case 'archive': return <ArchiveViewer file={file} onOpen={openChild} canOpenName={canOpenName} canOpen={canOpen} />;
    case 'model3d': return <ModelViewer file={file} siblings={o.siblings ?? []} />;
    case 'tsv': return <SheetViewer file={file} csv tsv />;
    case 'parquet': return <ParquetViewer file={file} />;
    case 'mbox': return <MboxViewer file={file} onOpen={openChild} />;
    case 'font': return <FontViewer file={file} />;
    case 'pptx': return <ErrorBox>{t('PowerPoint（PPTX）の表示は準備中です。もうしばらくお待ちください。')}</ErrorBox>;
    case 'dwg': return <ErrorBox>{t('DWG の表示は準備中です。CAD ソフトで DXF に書き出すと、ここで表示できます。')}</ErrorBox>;
    default: return <ErrorBox>{t('この形式のファイルには、まだ対応していません。対応形式の一覧をご確認ください。')}</ErrorBox>;
  }
}
