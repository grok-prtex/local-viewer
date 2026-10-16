import { setLang, setTheme, t, useLang, useResolvedTheme, useThemePref, type Lang, type ThemePref } from './i18n';

/** ヘッダー右のテーマ・言語切替（設定は localStorage に保存） */
export default function Prefs() {
  const lang = useLang(); const pref = useThemePref(); const resolved = useResolvedTheme();
  const themes: [ThemePref, string][] = [['auto', t('自動')], ['light', t('ライト')], ['dark', t('ダーク')]];
  const langs: [Lang, string][] = [['ja', '日本語'], ['en', 'English']];
  return (
    <div className="prefs" role="group" aria-label={t('表示設定')} data-testid="prefs">
      <div className="seg" role="radiogroup" aria-label={t('テーマ')} title={pref === 'auto' ? t('自動（OS に合わせる）') + ` · ${resolved}` : undefined}>
        {themes.map(([v, l]) => <button key={v} role="radio" aria-checked={pref === v} className={pref === v ? 'on' : ''} onClick={() => setTheme(v)} data-testid={`theme-${v}`}>{l}</button>)}
      </div>
      <div className="seg" role="radiogroup" aria-label={t('言語')}>
        {langs.map(([v, l]) => <button key={v} role="radio" lang={v} aria-checked={lang === v} className={lang === v ? 'on' : ''} onClick={() => setLang(v)} data-testid={`lang-${v}`}>{l}</button>)}
      </div>
    </div>
  );
}
