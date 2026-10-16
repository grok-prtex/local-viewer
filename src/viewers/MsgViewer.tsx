import { useEffect, useState } from 'react';
import MsgReader from '@kenjiuno/msgreader';
import MailView, { MailData, MailAttachment } from './Mail';
import { Loading, ErrorBox } from '../ui';
import type { MailAddr } from '../mailHeaders';

export default function MsgViewer({ file, onOpen, canOpen }: { file: File; onOpen: (f: File) => void; canOpen: (n: string, d: Uint8Array) => boolean }) {
  const [mail, setMail] = useState<MailData | null>(null);
  const [inline, setInline] = useState<Map<string, MailAttachment>>();
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    file.arrayBuffer().then((b) => {
      const r = new MsgReader(b);
      const d = r.getFileData();
      if (d.error) throw new Error(d.error);
      const rec = (t: string) => (d.recipients ?? []).filter((x) => (x.recipType ?? 'to') === t)
        .map((x): MailAddr => ({ name: x.name && x.name !== x.email ? x.name : '', address: x.smtpAddress || x.email || '' }))
        .filter((x) => x.name || x.address);
      let html: string | undefined = d.bodyHtml;
      if (!html && d.html) html = new TextDecoder().decode(d.html);
      const atts: MailAttachment[] = []; const inl = new Map<string, MailAttachment>();
      for (const a of d.attachments ?? []) {
        if (a.innerMsgContent) continue;
        const x = r.getAttachment(a);
        const att = { name: x.fileName, mime: a.attachMimeTag ?? '', data: x.content };
        const cid = a.pidContentId?.toLowerCase();
        if (cid && html?.toLowerCase().includes('cid:' + cid)) inl.set(cid, att); else atts.push(att);
      }
      if (!alive) return;
      setInline(inl);
      setMail({
        subject: d.subject ?? '',
        from: (() => { const address = d.senderSmtpAddress || d.senderEmail || ''; const name = d.senderName && d.senderName !== address ? d.senderName : ''; return name || address ? [{ name, address }] : []; })(),
        to: rec('to'), cc: rec('cc'),
        date: d.messageDeliveryTime || d.clientSubmitTime ? new Date((d.messageDeliveryTime || d.clientSubmitTime)!).toLocaleString('ja-JP') : '',
        html, text: d.body, attachments: atts,
      });
    }).catch(() => alive && setErr('Outlook のメール（MSG）を読み込めませんでした。'));
    return () => { alive = false; };
  }, [file]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!mail) return <Loading>メールを読み込んでいます</Loading>;
  return <MailView mail={mail} inlineImages={inline} onOpen={onOpen} canOpen={canOpen} />;
}
