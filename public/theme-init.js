// ちらつき防止：描画前にテーマと言語を <html> へ反映します（CSP の script-src 'self' に合わせ外部ファイル）。
(function () {
  var d = document.documentElement, th = null, lg = null;
  try { th = localStorage.getItem('lv-theme'); lg = localStorage.getItem('lv-lang'); } catch (e) { /* 何もしない */ }
  var dark = th === 'dark' || (th !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  d.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (lg !== 'ja' && lg !== 'en') lg = (navigator.language || '').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  d.lang = lg;
})();
