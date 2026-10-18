/* eslint-disable @typescript-eslint/no-explicit-any */
import DxfParser from 'dxf-parser';
import * as H from 'dxf-parser/dist/ParseHelpers.js';

/** DXF のバイト列を文字列にします。UTF-8 として正しくなければ $DWGCODEPAGE（無ければ Shift_JIS）で読みます */
export function decodeDxf(buf: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { /* 古い DXF */ }
  const head = new TextDecoder('latin1').decode(buf.subarray(0, 64 * 1024));
  const m = /\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*(\S+)/i.exec(head);
  const cp = (m?.[1] ?? 'ANSI_932').toUpperCase();
  // コードページが ANSI_1252 のままの日本語 DXF も多いので、Shift_JIS として正しく読めて日本語を含むならそちらを採ります
  if (cp !== 'ANSI_932') { try { const j = new TextDecoder('shift_jis', { fatal: true }).decode(buf); if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(j)) return j; } catch { /* 違う */ } }
  const map: Record<string, string> = { ANSI_932: 'shift_jis', DOS932: 'shift_jis', ANSI_936: 'gbk', ANSI_949: 'euc-kr', ANSI_950: 'big5', ANSI_1252: 'windows-1252', ANSI_1251: 'windows-1251', ANSI_1250: 'windows-1250' };
  try { return new TextDecoder(map[cp] ?? 'shift_jis').decode(buf); } catch { return new TextDecoder('shift_jis').decode(buf); }
}

const sjis = new TextDecoder('shift_jis');
const SPECIAL: Record<string, string> = { c: '⌀', d: '°', p: '±' };

/** TEXT の %%c などの制御コードと \U+XXXX / \M+NXXXX を置き換えます */
export function cleanText(s: string): string {
  return s
    .replace(/\\U\+([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\M\+\d([0-9a-fA-F]{4})/g, (_, h) => sjis.decode(new Uint8Array([parseInt(h.slice(0, 2), 16), parseInt(h.slice(2), 16)])))
    .replace(/%%([cdpCDP])/g, (_, c) => SPECIAL[c.toLowerCase()])
    .replace(/%%[uoUOkK]/g, '')
    .replace(/%%(\d{3})/g, (_, n) => String.fromCharCode(+n))
    .replace(/%%%/g, '%');
}

/** MTEXT の書式コード（\P \f \H \C \S {…} など）を取り除き、改行は \n にします */
/** GDT 系フォント（AIGDT / AMGDT / GDT）は英小文字の位置に幾何公差・穴の記号を持つため、Unicode の記号に置き換えます */
const GDT: Record<string, string> = {
  a: '∠', b: '⟂', c: '⏥', d: '⌓', e: '○', f: '∥', g: '⌭', h: '↗', i: '⌯', j: '⌖', k: '⌒', l: 'Ⓛ', m: 'Ⓜ', n: '⌀',
  p: 'Ⓟ', r: '◎', s: 'Ⓢ', t: '⌰', u: '⏤', v: '⌴', w: '⌵', x: '↧', y: '⊳',
};

export function cleanMText(s: string): string {
  let out = '';
  let gdt = false; const stack: boolean[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') { stack.push(gdt); continue; }
    if (ch === '}') { gdt = stack.pop() ?? false; continue; }
    if (ch === '^' && i + 1 < s.length) { const n = s[i + 1]; if (n === 'J' || n === 'M') { out += '\n'; i++; continue; } if (n === 'I') { out += ' '; i++; continue; } }
    if (ch !== '\\') { out += gdt ? (GDT[ch] ?? ch) : ch; continue; }
    const c = s[++i];
    if (c === undefined) break;
    if (c === 'P' || c === 'X') out += '\n';
    else if (c === 'N') out += '\n';
    else if (c === '~') out += '\u00a0';
    else if (c === '\\' || c === '{' || c === '}') out += c;
    else if (c === 'U' && s[i + 1] === '+') { out += String.fromCodePoint(parseInt(s.substr(i + 2, 4), 16)); i += 5; }
    else if (c === 'M' && s[i + 1] === '+') { const h = s.substr(i + 3, 4); out += sjis.decode(new Uint8Array([parseInt(h.slice(0, 2), 16), parseInt(h.slice(2), 16)])); i += 6; }
    else if (c === 'S') {
      const e = s.indexOf(';', i); const body = s.slice(i + 1, e < 0 ? undefined : e);
      const st = body.replace(/[\^#]/, '/').replace(/^\//, '').replace(/\/\s*$/, '');
      // 公差の積み重ね（10\S+0.05^0;）を「100.05」のように数字とくっつけない
      out += (/[0-9A-Za-z]$/.test(out) && st ? ' ' : '') + st; i = e < 0 ? s.length : e;
    }
    else if (c === 'f' || c === 'F') { const e = s.indexOf(';', i); const name = s.slice(i + 1, e < 0 ? undefined : e).split('|')[0].trim(); gdt = /^(ai|am)?gdt(\.shx)?$/i.test(name); i = e < 0 ? s.length : e; }
    else if ('HWQTACcpa'.includes(c)) { const e = s.indexOf(';', i); i = e < 0 ? s.length : e; }
    else if ('LlOoKk'.includes(c)) { /* 下線などの切替 */ }
    else out += c;
  }
  return cleanText(out);
}

function attribHandler(name: 'ATTRIB') {
  return {
    ForEntityName: name,
    parseEntity(scanner: any, curr: any) {
      const e: any = { type: curr.value };
      curr = scanner.next();
      while (!scanner.isEOF() && curr.code !== 0) {
        switch (curr.code) {
          case 1: e.text = curr.value; break;
          case 2: e.tag = curr.value; break;
          case 10: e.startPoint = H.parsePoint(scanner); break;
          case 11: e.endPoint = H.parsePoint(scanner); break;
          case 40: e.textHeight = curr.value; break;
          case 41: e.xScale = curr.value; break;
          case 50: e.rotation = curr.value; break;
          case 70: e.invisible = !!(curr.value & 1); break;
          case 72: e.halign = curr.value; break;
          case 74: e.valign = curr.value; break;
          case 100: case 280: break;
          default: H.checkCommonEntityProperties(e, curr, scanner);
        }
        curr = scanner.next();
      }
      return e;
    },
  };
}

const leaderHandler = {
  ForEntityName: 'LEADER',
  parseEntity(scanner: any, curr: any) {
    const e: any = { type: curr.value, vertices: [] as any[], arrow: true };
    curr = scanner.next();
    while (!scanner.isEOF() && curr.code !== 0) {
      switch (curr.code) {
        case 10: e.vertices.push(H.parsePoint(scanner)); break;
        case 71: e.arrow = curr.value !== 0; break;
        case 3: e.style = curr.value; break;
        case 100: break;
        default: if (curr.code < 100 || curr.code === 330 || curr.code === 360) H.checkCommonEntityProperties(e, curr, scanner);
      }
      curr = scanner.next();
    }
    return e;
  },
};

/** MLEADER：文字と引出線の頂点だけを読みます */
const mleaderHandler = {
  ForEntityName: 'MULTILEADER',
  parseEntity(scanner: any, curr: any) {
    const e: any = { type: 'MULTILEADER', lines: [] as any[][], leaders: [] as any[] };
    let state: 'ctx' | 'leader' | 'line' | 'top' = 'top'; let leader: any = null; let line: any[] | null = null;
    curr = scanner.next();
    while (!scanner.isEOF() && curr.code !== 0) {
      const c = curr.code, v = curr.value;
      if (c === 300 && v === 'CONTEXT_DATA{') state = 'ctx';
      else if (c === 301) state = 'top';
      else if (c === 302 && v === 'LEADER{') { state = 'leader'; leader = { dogleg: null, len: 0 }; e.leaders.push(leader); }
      else if (c === 303) state = 'ctx';
      else if (c === 304 && v === 'LEADER_LINE{') { state = 'line'; line = []; e.lines.push(line); }
      else if (c === 305) state = 'leader';
      else if (c === 304 && state === 'ctx') e.text = v;
      else if (state === 'line' && c === 10) line!.push(H.parsePoint(scanner));
      else if (state === 'leader' && c === 10) leader.last = H.parsePoint(scanner);
      else if (state === 'leader' && c === 11) leader.dir = H.parsePoint(scanner);
      else if (state === 'leader' && c === 40) leader.len = v;
      else if (state === 'ctx' && c === 12) e.textPos = H.parsePoint(scanner);
      else if (state === 'ctx' && c === 13) e.textDir = H.parsePoint(scanner);
      else if (state === 'ctx' && c === 41) e.textHeight = v;
      else if (state === 'ctx' && c === 140) e.arrowSize = v;
      else if (state === 'ctx' && c === 171) e.attach = v;
      else if (state === 'top' && (c === 8 || c === 62 || c === 420 || c === 67 || c === 330 || c === 6)) H.checkCommonEntityProperties(e, curr, scanner);
      curr = scanner.next();
    }
    return e;
  },
};
const mleaderAlias = { ...mleaderHandler, ForEntityName: 'MLEADER' };

const viewportHandler = {
  ForEntityName: 'VIEWPORT',
  parseEntity(scanner: any, curr: any) {
    const e: any = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF() && curr.code !== 0) {
      switch (curr.code) {
        case 10: e.center = H.parsePoint(scanner); break;
        case 12: e.viewCenter = H.parsePoint(scanner); break;
        case 40: e.width = curr.value; break;
        case 41: e.height = curr.value; break;
        case 45: e.viewHeight = curr.value; break;
        case 69: e.id = curr.value; break;
        case 90: e.status = curr.value; break;
        case 8: case 67: case 330: case 62: H.checkCommonEntityProperties(e, curr, scanner); break;
        default: break;
      }
      curr = scanner.next();
    }
    return e;
  },
};

export function parseDxf(text: string): any {
  const p = new DxfParser() as any;
  for (const h of [attribHandler('ATTRIB'), leaderHandler, mleaderHandler, mleaderAlias, viewportHandler]) p.registerEntityHandler(function (this: any) { Object.assign(this, h); } as any);
  return p.parseSync(text);
}
