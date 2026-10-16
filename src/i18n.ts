/**
 * 軽量な自前の多言語化。キーは日本語の原文そのもの（日本語表示では原文を返す）。
 * 英語は en.ts の辞書から引きます。{0} {1} … は差し込み値です。
 * 設定は localStorage に「言語」と「テーマ」の値だけを保存します（ファイル内容は保存しません）。
 */
import { useSyncExternalStore } from 'react';
import { EN } from './en';

export type Lang = 'ja' | 'en';
export type ThemePref = 'auto' | 'light' | 'dark';
const LANG_KEY = 'lv-lang';
const THEME_KEY = 'lv-theme';

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 保存できない環境では保存しない */ } };

export function initialLang(): Lang {
  const s = read(LANG_KEY);
  if (s === 'ja' || s === 'en') return s;
  return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

let lang: Lang = typeof navigator === 'undefined' ? 'ja' : initialLang();
let theme: ThemePref = (() => { const s = typeof localStorage === 'undefined' ? null : read(THEME_KEY); return s === 'light' || s === 'dark' ? s : 'auto'; })();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** キー末尾の「｜文脈」は訳し分け用で、日本語表示では消します */
const stripCtx = (s: string) => s.replace(/｜[^｜]*$/, '');
const fill = (s: string, v?: (string | number)[]) => (v ? s.replace(/\{(\d+)\}/g, (_, i) => String(v[Number(i)] ?? '')) : s);

/** 原文（日本語）を現在の言語にします */
export function t(ja: string, ...vals: (string | number)[]): string {
  if (lang === 'ja') return fill(stripCtx(ja), vals);
  const en = EN[ja];
  if (en == null) { if (import.meta.env?.DEV) console.warn('[i18n] missing:', ja); return fill(stripCtx(ja), vals); }
  return fill(en, vals);
}
export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l; write(LANG_KEY, l);
  document.documentElement.lang = l;
  document.title = t('なんでもローカルビューア | a-ef');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('PDF・メール・CAD・Office ファイルを、アップロードせずブラウザだけで表示します。'));
  emit();
}
export const useLang = () => useSyncExternalStore(subscribe, getLang, getLang);

// ---- テーマ ----
const mq = typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)');
export const resolvedTheme = (): 'light' | 'dark' => (theme === 'auto' ? (mq?.matches ? 'dark' : 'light') : theme);
const applyTheme = () => { document.documentElement.dataset.theme = resolvedTheme(); };
mq?.addEventListener('change', () => { if (theme === 'auto') { applyTheme(); emit(); } });
export const getTheme = () => theme;
export function setTheme(p: ThemePref) { theme = p; write(THEME_KEY, p); applyTheme(); emit(); }
export const useThemePref = () => useSyncExternalStore(subscribe, getTheme, getTheme);
export const useResolvedTheme = () => useSyncExternalStore(subscribe, resolvedTheme, resolvedTheme);

/** 起動時に一度だけ呼びます（theme-init.js と同じ結果をそろえる） */
export function initPrefs() { applyTheme(); setLang(lang); }
