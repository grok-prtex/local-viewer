/** Jupyter ノートブック（.ipynb、nbformat 3/4）を表示用に読みます。コードは実行しません */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type NbOutput =
  | { kind: 'stream'; name: string; text: string }
  | { kind: 'error'; ename: string; evalue: string; traceback: string }
  | { kind: 'image'; mime: string; src: string }
  | { kind: 'html'; html: string }
  | { kind: 'markdown'; text: string }
  | { kind: 'text'; text: string };
export type NbCell =
  | { type: 'code'; source: string; count: number | null; outputs: NbOutput[] }
  | { type: 'markdown'; source: string }
  | { type: 'raw'; source: string };
export type Notebook = { lang: string; hlLang: string; cells: NbCell[]; nbformat: number };

const join = (v: unknown): string => (Array.isArray(v) ? v.join('') : typeof v === 'string' ? v : '');
/** 端末の色コード（ESC[…m）を取り除きます */
// eslint-disable-next-line no-control-regex
export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
const HL: Record<string, string> = { python: 'python', python3: 'python', ipython: 'python', ipython3: 'python', r: 'r', julia: '', javascript: 'javascript', typescript: 'typescript', bash: 'bash', sh: 'bash', sql: 'sql', 'c++': 'cpp', cpp: 'cpp', c: 'c', java: 'java', go: 'go', rust: 'rust', ruby: 'ruby', matlab: 'matlab', octave: 'matlab', csharp: 'csharp', 'c#': 'csharp', powershell: 'powershell', scala: 'java', kotlin: 'kotlin' };

function mimeOutput(data: Record<string, unknown>): NbOutput | null {
  for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
    const b = join(data[mime]).replace(/\s+/g, '');
    if (b && /^[A-Za-z0-9+/=]+$/.test(b)) return { kind: 'image', mime, src: `data:${mime};base64,${b}` };
  }
  const svg = join(data['image/svg+xml']);
  // SVG は <img> で表示（スクリプトや外部参照は img では動かない）
  if (svg) return { kind: 'image', mime: 'image/svg+xml', src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) };
  const html = join(data['text/html']);
  if (html) return { kind: 'html', html };
  const md = join(data['text/markdown']);
  if (md) return { kind: 'markdown', text: md };
  const txt = join(data['text/plain']) || join(data['text/latex']) || (data['application/json'] ? JSON.stringify(data['application/json'], null, 2) : '');
  if (txt) return { kind: 'text', text: txt };
  return null;
}

function outputs(list: any[]): NbOutput[] {
  const out: NbOutput[] = [];
  for (const o of list ?? []) {
    const ty = o.output_type;
    if (ty === 'stream') {
      const name = o.name ?? o.stream ?? 'stdout', text = stripAnsi(join(o.text));
      const prev = out[out.length - 1];
      if (prev?.kind === 'stream' && prev.name === name) prev.text += text; else out.push({ kind: 'stream', name, text });
    } else if (ty === 'error' || ty === 'pyerr') {
      out.push({ kind: 'error', ename: o.ename ?? '', evalue: o.evalue ?? '', traceback: stripAnsi((o.traceback ?? []).join('\n')) });
    } else if (ty === 'execute_result' || ty === 'display_data' || ty === 'pyout' || ty === 'update_display_data') {
      // nbformat 3 は data を持たず mime 別キー（png, text, html）を直接持ちます
      const data = o.data ?? { 'image/png': o.png, 'image/jpeg': o.jpeg, 'text/html': o.html, 'text/plain': o.text, 'image/svg+xml': o.svg };
      const m = mimeOutput(data); if (m) out.push(m);
    }
  }
  return out;
}

/** markdown セルの attachment:名前 を data URI に置き換えます */
function inlineAttachments(src: string, att: any): string {
  if (!att) return src;
  return src.replace(/attachment:([^\s)"']+)/g, (m, name) => {
    const a = att[decodeURIComponent(name)] ?? att[name]; if (!a) return m;
    const mime = Object.keys(a).find((k) => k.startsWith('image/')); if (!mime) return m;
    return `data:${mime};base64,${join(a[mime]).replace(/\s+/g, '')}`;
  });
}

export function parseNotebook(text: string): Notebook {
  const nb = JSON.parse(text);
  if (!nb || typeof nb !== 'object') throw new Error('not a notebook');
  const md = nb.metadata ?? {};
  const lang = String(md.kernelspec?.language ?? md.language_info?.name ?? md.language ?? 'python').toLowerCase();
  const raw: any[] = nb.cells ?? (nb.worksheets ?? []).flatMap((w: any) => w.cells ?? []);
  if (!Array.isArray(raw)) throw new Error('no cells');
  const cells: NbCell[] = raw.map((c) => {
    const ty = c.cell_type;
    if (ty === 'code') return { type: 'code', source: join(c.source ?? c.input), count: c.execution_count ?? c.prompt_number ?? null, outputs: outputs(c.outputs) };
    if (ty === 'markdown' || ty === 'heading') {
      const s = join(c.source); return { type: 'markdown', source: inlineAttachments(ty === 'heading' ? '#'.repeat(c.level ?? 1) + ' ' + s : s, c.attachments) };
    }
    return { type: 'raw', source: join(c.source) };
  });
  return { lang, hlLang: HL[lang] ?? lang, cells, nbformat: nb.nbformat ?? 4 };
}
