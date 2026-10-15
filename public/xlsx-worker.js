/* Excel（XLSX）をブラウザ内で読みます。ネットワーク通信は行いません。 */
self.importScripts('/vendor/exceljs/exceljs.bare.min.js');
function colOf(a) { let c = 0; for (const ch of a.toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64); return c - 1; }
function fmtDate(d, f) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear(), m = p(d.getMonth() + 1), day = p(d.getDate());
  if (/yyyy|yy/.test(f || '')) return (f || 'yyyy/mm/dd').replace('yyyy', y).replace('yy', String(y).slice(-2)).replace('mm', m).replace('dd', day);
  return y + '/' + m + '/' + day;
}
function fmtNum(n, f) {
  if (f == null) return String(n);
  let s = f, neg = n < 0; n = Math.abs(n);
  if (s.includes('¥') || s.includes('$')) { const cur = s.match(/[¥$€]/)?.[0] || ''; s = s.replace(/[¥$€]/g, ''); return (neg ? '-' : '') + cur + fmtNum(n, s); }
  if (s.includes('%')) return ((neg ? -n : n) * 100).toFixed((s.split('.')[1] || '').replace(/[^0]/g, '').length) + '%';
  const dec = (s.split('.')[1] || '').replace(/[^0]/g, '').length;
  let body = n.toFixed(dec);
  if (s.includes(',')) { const [a, b] = body.split('.'); body = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b != null ? '.' + b : ''); }
  return (neg ? '-' : '') + body;
}
function cellText(cell) {
  let v = cell.value;
  if (v && typeof v === 'object' && 'richText' in v) return v.richText.map((x) => x.text).join('');
  if (v && typeof v === 'object' && 'text' in v && 'hyperlink' in v) return v.text;
  if (v && typeof v === 'object' && 'formula' in v) v = v.result != null ? v.result : (cell.text || '');
  if (v instanceof Date) return fmtDate(v, cell.numFmt || 'yyyy/mm/dd');
  if (typeof v === 'string' && /Invalid Date/i.test(v)) return '';
  if (typeof v === 'number') return fmtNum(v, cell.numFmt);
  if (v == null || v === '') return '';
  return String(v);
}
self.onmessage = async (e) => {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(e.data.buffer);
    const sheets = wb.worksheets.map((ws) => {
      const cols = [];
      for (let i = 1; i <= (ws.columnCount || 0); i++) { const c = ws.getColumn(i); cols.push({ w: c.width != null ? Math.round(c.width * 7.5 + 5) : 80, hidden: !!c.hidden }); }
      const edge = (x) => x && x.style && x.style !== 'none' ? (x.color && x.color.argb ? '#' + x.color.argb.slice(2) : '#888') : null;
      const rows = [];
      ws.eachRow({ includeEmpty: true }, (row) => {
        const cells = [];
        row.eachCell({ includeEmpty: true }, (cell, cn) => {
          const f = cell.fill && cell.fill.fgColor, font = cell.font || {}, border = cell.border || {}, al = cell.alignment || {};
          cells.push({ c: cn - 1, v: cellText(cell), bg: f && f.argb ? '#' + f.argb.slice(2) : null, fg: font.color && font.color.argb ? '#' + font.color.argb.slice(2) : null, b: !!font.bold, i: !!font.italic, u: !!font.underline, sz: font.size || null, ha: al.horizontal || null, va: al.vertical || null, wrap: !!al.wrapText, bt: edge(border.top), bb: edge(border.bottom), bl: edge(border.left), br: edge(border.right) });
        });
        rows.push({ h: row.height != null ? Math.round(row.height * 1.33) : 22, hidden: !!row.hidden, cells });
      });
      const merges = [];
      for (const m of ws.model.merges || []) { const [tl, br] = String(m).split(':'); const A = (a) => { const x = /^([A-Z]+)(\d+)$/i.exec(a); return { r: +x[2] - 1, c: colOf(x[1]) }; }; const a = A(tl), b = A(br); merges.push({ r: a.r, c: a.c, rowspan: b.r - a.r + 1, colspan: b.c - a.c + 1 }); }
      const vw = ws.views && ws.views[0];
      return { name: ws.name, cols, rows, merges, freeze: vw && vw.state === 'frozen' ? { x: vw.xSplit || 0, y: vw.ySplit || 0 } : null };
    });
    self.postMessage({ ok: true, sheets });
  } catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
