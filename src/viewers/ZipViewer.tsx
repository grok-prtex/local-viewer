import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { size } from './Mail';
import { Loading, ErrorBox } from '../ui';

export default function ZipViewer({ file, onOpen, canOpenName }: { file: File; onOpen: (f: File) => void; canOpenName: (n: string) => boolean }) {
  const [zip, setZip] = useState<JSZip | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    JSZip.loadAsync(file, { decodeFileName: (b) => {
      const u = b as Uint8Array;
      try { return new TextDecoder('utf-8', { fatal: true }).decode(u); } catch { return new TextDecoder('shift_jis').decode(u); }
    } }).then((z) => alive && setZip(z)).catch(() => alive && setErr('ZIP を読み込めませんでした。パスワード付きの ZIP は、現在は開けません。'));
    return () => { alive = false; };
  }, [file]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!zip) return <Loading>ZIP を読み込んでいます</Loading>;
  const files = Object.values(zip.files).filter((f) => !f.dir && !f.name.startsWith('__MACOSX/'));
  const open = async (name: string) => {
    const data = await zip.file(name)!.async('uint8array');
    onOpen(new File([data as BlobPart], name.split('/').pop() || name));
  };
  const save = async (name: string) => {
    const blob = await zip.file(name)!.async('blob'); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name.split('/').pop() || name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  return (
    <div className="zip">
      <div className="label mono">ENTRIES · {files.length}</div>
      <ul data-testid="zip-list">
        {files.map((f) => {
          const sz = (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
          return (
            <li key={f.name}>
              <span className="att-name">{f.name}</span>
              {sz != null && <span className="mono att-size">{size(sz)}</span>}
              {canOpenName(f.name) && <button onClick={() => open(f.name)}>開く</button>}
              <button className="ghost" onClick={() => save(f.name)}>保存</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
