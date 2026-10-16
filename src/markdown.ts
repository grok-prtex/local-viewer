import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { t } from './i18n';

const FORBID_TAGS = ['style', 'iframe', 'form', 'input', 'object', 'embed', 'script', 'link', 'meta', 'base', 'frame', 'frameset', 'svg', 'math', 'video', 'audio', 'source'];

/** HTML を安全にします（スクリプト・外部画像・style 属性を除去、リンクは別タブ＋参照元なし） */
export function sanitizeHtml(raw: string): string {
  const purify = DOMPurify();
  purify.addHook('afterSanitizeAttributes', (n) => {
    const el = n as Element;
    if (el.tagName === 'IMG') { const s = el.getAttribute('src') ?? ''; if (!s.startsWith('data:image/')) { el.replaceWith(Object.assign(document.createElement('span'), { className: 'md-noimg', textContent: t('［画像：{0}（外部の画像は読み込みません）］', el.getAttribute('alt') || s) })); } }
    if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
  });
  return purify.sanitize(raw, { FORBID_TAGS, FORBID_ATTR: ['style', 'srcset', 'background', 'poster'] });
}

/** Markdown を安全な HTML にします */
export function renderMarkdown(src: string): string {
  return sanitizeHtml(marked.parse(src, { async: false, gfm: true }) as string);
}
