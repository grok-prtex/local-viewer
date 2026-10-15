/* SQLite をブラウザ内（WASM）で開きます。書き込みはしません。 */
importScripts('/vendor/sqljs/sql-wasm.js');
let SQL = null;
async function init() {
  if (!SQL) SQL = await initSqlJs({ locateFile: (f) => '/vendor/sqljs/' + f });
  return SQL;
}
function isReadonly(q) {
  const s = q.trim().replace(/--.*$/mg, '').replace(/\/\*[\s\S]*?\*\//g, '');
  if (!/^(select|with|pragma|explain)\b/i.test(s)) return false;
  return !/\b(insert|update|delete|drop|alter|create|attach|detach|replace|vacuum|reindex|into)\b/i.test(s.replace(/'[^']*'/g, ''));
}
self.onmessage = async (e) => {
  try {
    if (e.data.warm) { await init(); return; }
    const S = await init();
    const db = new S.Database(new Uint8Array(e.data.buffer));
    if (e.data.sql != null) {
      if (!isReadonly(e.data.sql)) { self.postMessage({ ok: false, error: 'readonly' }); db.close(); return; }
      const result = db.exec(e.data.sql);
      self.postMessage({ ok: true, result }); db.close(); return;
    }
    const tables = db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name");
    const list = (tables[0]?.values || []).map(([name, type]) => ({ name, type }));
    const schemas = {};
    for (const t of list) {
      try { schemas[t.name] = (db.exec('PRAGMA table_info(' + JSON.stringify(t.name) + ')')[0]?.values) || []; } catch { schemas[t.name] = []; }
    }
    // 各テーブルの行数だけを先に取ります
    const counts = {};
    for (const t of list) { try { counts[t.name] = db.exec('SELECT COUNT(*) FROM ' + JSON.stringify(t.name))[0].values[0][0]; } catch { counts[t.name] = null; } }
    self.postMessage({ ok: true, tables: list, schemas, counts });
    db.close();
  } catch (err) { self.postMessage({ ok: false, error: String(err) }); }
};
