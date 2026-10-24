import { useEffect, useMemo, useState } from 'react';
import { size } from './Mail';
import { ErrorBox } from '../ui';
import { Progress, type ProgressState } from '../progress';
import { t } from '../i18n';
import { ArcError, GZ_MAX, MAX_ENTRIES, SEVENZ_MAX, blobReader, bytesReader, gunzip, innerName, isTar, listTar, type ArcEntry } from '../archive';

/** 一覧の 1 行。get() で中身を取り出します */
interface Item extends ArcEntry { get?: () => Promise<Blob>; }
interface Loaded { kind: '7z' | 'tar' | 'tgz' | 'gz'; items: Item[]; truncated: boolean; encrypted: boolean; close?: () => void; gzOk?: boolean; }

const ST = ['読み込み中', '解析中'] as const;
/** 中身 1 つだけの .gz を自動で開いたファイル（戻ったときに繰り返さないため） */
const autoOpened = new WeakSet<File>();

function fail(e: unknown): string {
  const c = e instanceof ArcError ? e.code : '';
  if (c === 'too-large') return t('展開後の大きさが上限（{0}）を超えるため開けません。', size(GZ_MAX));
  if (c === 'encrypted') return t('パスワードで保護されているため、中身を表示できません。');
  if ((e as Error)?.message === 'cancelled') return t('読み込みをキャンセルしました。');
  return t('アーカイブを読み込めませんでした。ファイルが壊れているか、対応していない形式の可能性があります。');
}

async function load7z(file: File): Promise<Loaded> {
  if (file.size > SEVENZ_MAX) throw new ArcError('too-large');
  const { Archive } = await import('libarchive.js');
  let worker: Worker | null = null;
  const died = new Promise<never>((_, rej) => {
    Archive.init({ getWorker: () => { worker = new Worker('/vendor/libarchive/worker-bundle.js', { type: 'module' }); worker.addEventListener('error', () => rej(new ArcError('corrupt'))); return worker; } });
  });
  const arc = await Promise.race([Archive.open(file), died]);
  const close = () => { arc.close().catch(() => {}); };
  try {
    const list = (await Promise.race([arc.getFilesArray(), died])) as { file: { name: string; size: number; lastModified: number; extract: () => Promise<File> }; path: string }[];
    const enc = !!(await arc.hasEncryptedData());
    if (!list.length) { close(); throw new ArcError(enc ? 'encrypted' : 'corrupt'); }
    const items: Item[] = list.slice(0, MAX_ENTRIES).map(({ file: f, path }) => ({
      name: path + f.name, size: f.size, dir: false, mtime: f.lastModified ? new Date(f.lastModified / 1e6) : undefined,
      get: async () => { try { return await f.extract(); } catch (e) { throw /encrypt/i.test(String((e as Error)?.message)) ? new ArcError('encrypted') : new ArcError('corrupt'); } },
    }));
    return { kind: '7z', items, truncated: list.length > MAX_ENTRIES, encrypted: enc, close };
  } catch (e) { close(); throw e instanceof ArcError ? e : new ArcError('corrupt'); }
}

function tarItems(list: ArcEntry[], slice: (o: number, n: number) => Blob): Item[] {
  return list.map((e) => (e.dir ? e : { ...e, get: async () => slice(e.offset!, e.size) }));
}

export default function ArchiveViewer({ file, onOpen, canOpenName, canOpen }: { file: File; onOpen: (f: File) => void; canOpenName: (n: string) => boolean; canOpen: (n: string, d: Uint8Array) => boolean }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ST });
  const [busy, setBusy] = useState<string | null>(null);
  const [job] = useState(() => ({ cancelled: false }));

  useEffect(() => {
    let alive = true; let close: (() => void) | undefined; job.cancelled = false;
    (async () => {
      if (!file.size) throw new ArcError('corrupt');
      const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
      const ext = file.name.toLowerCase();
      if (head[0] === 0x37 && head[1] === 0x7a && head[2] === 0xbc && head[3] === 0xaf) {
        setProg({ stage: '解析中', detail: t('目次を読んでいます'), stages: ST });
        return load7z(file);
      }
      if (head[0] === 0x1f && head[1] === 0x8b) {
        const out = await gunzip(file, GZ_MAX, (i, o) => alive && setProg({ stage: '読み込み中', pct: (i / file.size) * 100, detail: size(o), stages: ST }), job);
        setProg({ stage: '解析中', detail: t('目次を読んでいます'), stages: ST });
        if (isTar(out) || /\.(tgz|tar\.gz)$/.test(ext)) {
          const l = await listTar(bytesReader(out), out.length);
          return { kind: 'tgz', items: tarItems(l.entries, (o, n) => new Blob([out.subarray(o, o + n)])), truncated: l.truncated, encrypted: false } as Loaded;
        }
        const name = innerName(file.name, head);
        return { kind: 'gz', items: [{ name, size: out.length, dir: false, get: async () => new Blob([out]) }], truncated: false, encrypted: false, gzOk: canOpen(name, out.subarray(0, 1024)) } as Loaded;
      }
      if (!isTar(head)) throw new ArcError('corrupt');
      setProg({ stage: '解析中', detail: t('目次を読んでいます'), stages: ST });
      const l = await listTar(blobReader(file), file.size);
      return { kind: 'tar', items: tarItems(l.entries, (o, n) => file.slice(o, o + n)), truncated: l.truncated, encrypted: false } as Loaded;
    })().then((d) => {
      close = d.close;
      if (!alive) { close?.(); return; }
      setData(d);
      if (d.kind === 'gz' && !autoOpened.has(file) && d.gzOk) {
        autoOpened.add(file); d.items[0].get!().then((b) => alive && onOpen(new File([b], d.items[0].name)));
      }
      // 中身だけが暗号化された 7z は、目次からは分からないため、いちばん小さいファイルで確かめます
      if (d.kind === '7z' && !d.encrypted) {
        const small = d.items.filter((x) => x.get).sort((a, b) => a.size - b.size)[0];
        small?.get!().catch((e) => { if (alive && e instanceof ArcError && e.code === 'encrypted') setData((p) => (p ? { ...p, encrypted: true } : p)); });
      }
    }).catch((e) => { if (alive) { console.warn('archive failed', e); setErr(fail(e)); } });
    return () => { alive = false; job.cancelled = true; close?.(); };
  }, [file, job, onOpen, canOpen]);

  const tree = useMemo(() => (data ? buildTree(data.items) : null), [data]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!data || !tree) return <Progress p={prog} onCancel={() => { job.cancelled = true; setErr(t('読み込みをキャンセルしました。')); }} />;
  const base = (n: string) => n.replace(/\/$/, '').split('/').pop() || n;
  const open = async (it: Item) => {
    setBusy(base(it.name)); setNote('');
    try { const b = await it.get!(); setBusy(null); onOpen(new File([b], base(it.name))); }
    catch (e) { setBusy(null); setNote(fail(e)); }
  };
  const save = async (it: Item) => {
    setNote('');
    try {
      const b = await it.get!(); const url = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = url; a.download = base(it.name); a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setNote(fail(e)); }
  };
  const files = data.items.filter((x) => !x.dir);
  const row = (it: Item) => (
    <li key={it.name}>
      <span className="att-name">{base(it.name)}</span>
      <span className="mono att-size">{size(it.size)}</span>
      {!data.encrypted && (data.gzOk || canOpenName(it.name)) && <button onClick={() => open(it)}>{t('開く')}</button>}
      {!data.encrypted && <button className="ghost" onClick={() => save(it)}>{t('保存')}</button>}
    </li>
  );
  const flat = tree.dirs.size === 0;
  return (
    <div className="zip" data-testid="archive-view" data-kind={data.kind}>
      {data.encrypted && <p className="banner warn" data-testid="arc-encrypted">{t('パスワードで保護されているため、ファイル名の一覧だけを表示しています。中身は取り出せません。')}</p>}
      {data.truncated && <p className="hint">{t('項目が多いため、最初の {0} 件だけを表示しています。', MAX_ENTRIES.toLocaleString())}</p>}
      {note && <p className="banner warn" role="alert" data-testid="arc-note">{note}</p>}
      {busy && <Progress p={{ stage: '解析中', detail: t('{0} を取り出しています', busy), stages: ST }} />}
      <div className="label mono">ENTRIES · {files.length}</div>
      <ul data-testid="zip-list" className={flat ? '' : 'ztree'}>
        {sortDirs(tree).map((c) => <DirView key={c.path} d={c} depth={0} row={row} />)}
        {tree.files.map(row)}
      </ul>
    </div>
  );
}

type Dir = { name: string; path: string; dirs: Map<string, Dir>; files: Item[] };
function buildTree(items: Item[]): Dir {
  const root: Dir = { name: '', path: '', dirs: new Map(), files: [] };
  for (const f of items) {
    const parts = f.name.replace(/\/$/, '').split('/'); let d = root;
    const n = f.dir ? parts.length : parts.length - 1;
    for (let i = 0; i < n; i++) { const p = parts[i]; if (!d.dirs.has(p)) d.dirs.set(p, { name: p, path: d.path + p + '/', dirs: new Map(), files: [] }); d = d.dirs.get(p)!; }
    if (!f.dir) d.files.push(f);
  }
  return root;
}
const sortDirs = (d: Dir) => [...d.dirs.values()].sort((a, b) => a.name.localeCompare(b.name));
function DirView({ d, depth, row }: { d: Dir; depth: number; row: (i: Item) => React.ReactNode }) {
  const [openD, setOpenD] = useState(depth < 1);
  return (
    <li className="zdir">
      <button className="zdir-btn" onClick={() => setOpenD(!openD)} aria-expanded={openD}>{openD ? '▾' : '▸'} {d.name}/</button>
      {openD && <ul>{sortDirs(d).map((c) => <DirView key={c.path} d={c} depth={depth + 1} row={row} />)}{d.files.map(row)}</ul>}
    </li>
  );
}
