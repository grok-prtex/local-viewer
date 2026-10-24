import { useMemo } from 'react';
import type { MailAddr } from '../mailHeaders';
import Recipients from './Recipients';
import { t } from '../i18n';

export interface MailAttachment { name: string; mime: string; data: Uint8Array; }
export interface MailData {
  subject: string; from: MailAddr[]; to: MailAddr[]; cc: MailAddr[]; date: string;
  html?: string; text?: string; attachments: MailAttachment[];
}

const MISSING_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="6" fill="#EEF0EC" stroke="#C2C5BE"/><path d="M16 16l16 16M32 16L16 32" stroke="#878D95" stroke-width="3"/></svg>');

/** 外部リソースを読まないメール本文 HTML（スクリプト無効・リモート画像は CSP で遮断） */
function buildSrcdoc(html: string, inline: Map<string, string>): string {
  // 添付に見つからない cid: 画像は、遮断エラーの代わりに「画像なし」の目印に置き換えます
  const body = html.replace(/cid:([^"'\s)>]+)/gi, (_m, id) => inline.get(id.toLowerCase()) ?? MISSING_IMG);
  const csp = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"><style>body{font-family:"IBM Plex Sans JP",system-ui,sans-serif;font-size:15px;line-height:1.65;color:#15171A;margin:16px;word-break:break-word}img{max-width:100%}</style></head><body>${body}</body></html>`;
}

function toDataUrl(a: MailAttachment): string {
  let s = ''; const chunk = 0x8000;
  for (let i = 0; i < a.data.length; i += chunk) s += String.fromCharCode(...a.data.subarray(i, i + chunk));
  return `data:${a.mime || 'application/octet-stream'};base64,${btoa(s)}`;
}

export default function MailView({ mail, inlineImages, onOpen, canOpen }: {
  mail: MailData; inlineImages?: Map<string, MailAttachment>;
  onOpen: (f: File) => void; canOpen: (name: string, data: Uint8Array) => boolean;
}) {
  const srcdoc = useMemo(() => {
    if (!mail.html) return '';
    const m = new Map<string, string>();
    inlineImages?.forEach((a, id) => { if (a.data.length < 5_000_000) m.set(id, toDataUrl(a)); });
    return buildSrcdoc(mail.html, m);
  }, [mail, inlineImages]);
  const download = (a: MailAttachment) => {
    const url = URL.createObjectURL(new Blob([a.data as BlobPart], { type: a.mime || 'application/octet-stream' }));
    const el = document.createElement('a'); el.href = url; el.download = a.name || 'attachment';
    el.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  return (
    <div className="mail">
      <dl className="mail-head">
        <dt>{t('件名')}</dt><dd className="subject">{mail.subject || t('（件名なし）')}</dd>
        <dt>{t('差出人')}</dt><dd><Recipients list={mail.from} testid="mail-from" /></dd>
        <dt>{t('宛先')}</dt><dd><Recipients list={mail.to} testid="mail-to" /></dd>
        {mail.cc.length > 0 && <><dt>CC</dt><dd><Recipients list={mail.cc} testid="mail-cc" /></dd></>}
        <dt>{t('日時')}</dt><dd>{mail.date}</dd>
      </dl>
      {mail.attachments.length > 0 && (
        <div className="attachments">
          <div className="label mono">{t('添付ファイル')} · {mail.attachments.length}</div>
          <ul>
            {mail.attachments.map((a, i) => (
              <li key={i}>
                <span className="att-name">{a.name || t('（名前なし）')}</span>
                <span className="mono att-size">{size(a.data.length)}</span>
                {canOpen(a.name, a.data) && <button onClick={() => onOpen(new File([a.data as BlobPart], a.name, { type: a.mime }))}>{t('開く')}</button>}
                <button className="ghost" onClick={() => download(a)}>{t('保存')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {mail.html
        ? <iframe className="mail-body" title={t('メール本文')} sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={srcdoc} data-testid="mail-body" />
        : <pre className="mail-text" data-testid="mail-body">{mail.text || t('（本文なし）')}</pre>}
      {mail.html && <p className="hint">{t('本文中の外部画像やスクリプトは、安全のため読み込みません。')}</p>}
    </div>
  );
}

export function size(n: number) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
