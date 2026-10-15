import { useEffect, useState } from 'react';
import PostalMime from 'postal-mime';
import MailView, { MailData, MailAttachment } from './Mail';
import { Loading, ErrorBox } from '../ui';

type Addr = { name?: string; address?: string; group?: Addr[] };
const fmtAddr = (a?: Addr | Addr[]) => (a ? (Array.isArray(a) ? a : [a]) : [])
  .flatMap((x) => (x.group ? x.group : [x]))
  .map((x) => (x.name ? `${x.name} <${x.address ?? ''}>` : x.address ?? '')).join(', ');

export default function EmlViewer({ file, onOpen, canOpen }: { file: File; onOpen: (f: File) => void; canOpen: (n: string, d: Uint8Array) => boolean }) {
  const [mail, setMail] = useState<MailData | null>(null);
  const [inline, setInline] = useState<Map<string, MailAttachment>>();
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    file.arrayBuffer().then((b) => PostalMime.parse(b)).then((e) => {
      const toU8 = (c: ArrayBuffer | string | Uint8Array) => typeof c === 'string' ? new TextEncoder().encode(c) : new Uint8Array(c as ArrayBuffer);
      const inl = new Map<string, MailAttachment>();
      const atts: MailAttachment[] = [];
      for (const a of e.attachments) {
        const att = { name: a.filename ?? '', mime: a.mimeType, data: toU8(a.content) };
        const cid = a.contentId?.replace(/^<|>$/g, '').toLowerCase();
        if (cid && a.disposition === 'inline' && e.html?.toLowerCase().includes('cid:' + cid)) inl.set(cid, att);
        else atts.push(att);
      }
      if (!alive) return;
      setInline(inl);
      setMail({
        subject: e.subject ?? '', from: fmtAddr(e.from as Addr), to: fmtAddr(e.to as Addr[]), cc: fmtAddr(e.cc as Addr[]),
        date: e.date ? new Date(e.date).toLocaleString('ja-JP') : '', html: e.html, text: e.text, attachments: atts,
      });
    }).catch(() => alive && setErr('メールを読み込めませんでした。EML 形式ではない可能性があります。'));
    return () => { alive = false; };
  }, [file]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!mail) return <Loading>メールを読み込んでいます</Loading>;
  return <MailView mail={mail} inlineImages={inline} onOpen={onOpen} canOpen={canOpen} />;
}
