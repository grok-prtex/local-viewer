import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { size } from './Mail';
import { ErrorBox } from '../ui';
import { Progress, readWithProgress, type ProgressState } from '../progress';

export default function ZipViewer({ file, onOpen, canOpenName }: { file: File; onOpen: (f: File) => void; canOpenName: (n: string) => boolean }) {
  const [zip, setZip] = useState<JSZip | null>(null);
  const [err, setErr] = useState('');
  const [prog, setProg] = useState<ProgressState>({ stage: '読み込み中', pct: 0, stages: ['読み込み中', '解析中'] });
  const [ext, setExt] = useState<{ name: string; pct: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const st = ['読み込み中', '解析中'] as const;
    readWithProgress(file, (pct) => alive && setProg({ stage: '読み込み中', pct, stages: st })).then((buf) => { if (alive) setProg({ stage: '解析中', detail: '目次を読んでいます', stages: st }); return JSZip.loadAsync(buf, { decodeFileName: (b) => {
      const u = b as Uint8Array;
      try { return new TextDecoder('utf-8', { fatal: true }).decode(u); } catch { return new TextDecoder('shift_jis').decode(u); }
    } }); }).then((z) => alive && setZip(z)).catch(() => alive && setErr('ZIP を読み込めませんでした。パスワード付きの ZIP は、現在は開けません。'));
    return () => { alive = false; };
  }, [file]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!zip) return <Progress p={prog} />;
  if (ext) return <Progress p={{ stage: '解析中', pct: ext.pct, detail: `${ext.name} を取り出しています`, stages: ['読み込み中', '解析中'] }} />;
  const files = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith('__MACOSX/'));
  const open = async (name: string) => {
    setExt({ name: name.split('/').pop() || name, pct: 0 });
    const data = await zip.file(name)!.async('uint8array', (m) => setExt({ name: name.split('/').pop() || name, pct: m.percent }));
    setExt(null);
    onOpen(new File([data as BlobPart], name.split('/').pop() || name));
  };
  const save = async (name: string) => {
    const blob = await zip.file(name)!.async('blob'); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name.split('/').pop() || name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  // フォルダーごとのツリーにします（ソースコード一式などを見て回れるように）
  type Dir = { name: string; path: string; dirs: Map<string, Dir>; files: typeof files };
  const root: Dir = { name: '', path: '', dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.name.split('/'); let d = root;
    for (let i = 0; i < parts.length - 1; i++) { const p = parts[i]; if (!d.dirs.has(p)) d.dirs.set(p, { name: p, path: d.path + p + '/', dirs: new Map(), files: [] }); d = d.dirs.get(p)!; }
    d.files.push(f);
  }
  const flat = root.dirs.size === 0;
  const row = (f: (typeof files)[number]) => {
    const sz = (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    return (
      <li key={f.name}>
        <span className="att-name">{f.name.split('/').pop()}</span>
        {sz != null && <span className="mono att-size">{size(sz)}</span>}
        {canOpenName(f.name) && <button onClick={() => open(f.name)}>開く</button>}
        <button className="ghost" onClick={() => save(f.name)}>保存</button>
      </li>
    );
  };
  const DirView = ({ d, depth }: { d: Dir; depth: number }) => {
    const [openD, setOpenD] = useState(depth < 1);
    return (
      <li className="zdir">
        <button className="zdir-btn" onClick={() => setOpenD(!openD)} aria-expanded={openD}>{openD ? '▾' : '▸'} {d.name}/</button>
        {openD && <ul>{[...d.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <DirView key={c.path} d={c} depth={depth + 1} />)}{d.files.map(row)}</ul>}
      </li>
    );
  };
  return (
    <div className="zip">
      <div className="label mono">ENTRIES · {files.length}</div>
      <ul data-testid="zip-list" className={flat ? '' : 'ztree'}>
        {[...root.dirs.values()].sort((a, b) => a.name.localeCompare(b.name)).map((c) => <DirView key={c.path} d={c} depth={0} />)}
        {root.files.map(row)}
      </ul>
    </div>
  );
}
