/** highlight.js（必要な言語だけを同梱）。テキストビューアから遅延読み込みされます。 */
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import java from 'highlight.js/lib/languages/java';
import kotlin from 'highlight.js/lib/languages/kotlin';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import swift from 'highlight.js/lib/languages/swift';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import dos from 'highlight.js/lib/languages/dos';
import sql from 'highlight.js/lib/languages/sql';
import vbnet from 'highlight.js/lib/languages/vbnet';
import vbscript from 'highlight.js/lib/languages/vbscript';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import lua from 'highlight.js/lib/languages/lua';
import r from 'highlight.js/lib/languages/r';
import matlab from 'highlight.js/lib/languages/matlab';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import ini from 'highlight.js/lib/languages/ini';
import markdown from 'highlight.js/lib/languages/markdown';
import gcode from 'highlight.js/lib/languages/gcode';
import diff from 'highlight.js/lib/languages/diff';
import makefile from 'highlight.js/lib/languages/makefile';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import type { HLJSApi, Language } from 'highlight.js';

/** IEC 61131-3 構造化テキスト（ST / SCL）の簡易定義 */
function iecst(h: HLJSApi): Language {
  return {
    name: 'IEC 61131-3 ST', case_insensitive: true,
    keywords: {
      keyword: 'IF THEN ELSE ELSIF END_IF CASE OF END_CASE FOR TO BY DO END_FOR WHILE END_WHILE REPEAT UNTIL END_REPEAT EXIT RETURN CONTINUE ' +
        'PROGRAM END_PROGRAM FUNCTION END_FUNCTION FUNCTION_BLOCK END_FUNCTION_BLOCK ORGANIZATION_BLOCK END_ORGANIZATION_BLOCK DATA_BLOCK END_DATA_BLOCK ' +
        'VAR VAR_INPUT VAR_OUTPUT VAR_IN_OUT VAR_TEMP VAR_GLOBAL VAR_EXTERNAL VAR_STAT CONSTANT RETAIN END_VAR TYPE END_TYPE STRUCT END_STRUCT ARRAY BEGIN ' +
        'AND OR XOR NOT MOD AT REGION END_REGION METHOD END_METHOD INTERFACE END_INTERFACE PROPERTY END_PROPERTY',
      type: 'BOOL BYTE WORD DWORD LWORD SINT INT DINT LINT USINT UINT UDINT ULINT REAL LREAL TIME LTIME DATE TIME_OF_DAY TOD DATE_AND_TIME DT STRING WSTRING CHAR TON TOF TP CTU CTD R_TRIG F_TRIG',
      literal: 'TRUE FALSE',
    },
    contains: [
      h.COMMENT('\\(\\*', '\\*\\)'), h.C_LINE_COMMENT_MODE, h.C_BLOCK_COMMENT_MODE,
      { className: 'string', begin: "'", end: "'" }, { className: 'string', begin: '"', end: '"' },
      { className: 'number', begin: '\\b(16#[0-9A-Fa-f_]+|2#[01_]+|8#[0-7_]+|T#[0-9a-zA-Z_.]+|\\d[\\d_]*(\\.\\d+)?([eE][-+]?\\d+)?)' },
      { className: 'symbol', begin: '%[IQM][XBWDL]?\\d+(\\.\\d+)?' },
    ],
  };
}

const langs: Record<string, (h: HLJSApi) => Language> = { python, javascript, typescript, c, cpp, csharp, java, kotlin, go, rust, ruby, php, swift, bash, powershell, dos, sql, vbnet, vbscript, css, scss, lua, r, matlab, xml, json, yaml, ini, markdown, gcode, diff, makefile, dockerfile, iecst };
for (const [n, l] of Object.entries(langs)) hljs.registerLanguage(n, l);

export function highlight(code: string, lang: string): string {
  if (!lang || !hljs.getLanguage(lang)) return escapeHtml(code);
  return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** ハイライト済み HTML を行ごとに分けます（行をまたぐ span は閉じて次の行で開き直します） */
export function splitLines(html: string): string[] {
  const out: string[] = []; const stack: string[] = []; let cur = '';
  const re = /(<span[^>]*>)|(<\/span>)|(\n)|([^<\n]+|<)/g; let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1]) { stack.push(m[1]); cur += m[1]; }
    else if (m[2]) { stack.pop(); cur += m[2]; }
    else if (m[3]) { out.push(cur + '</span>'.repeat(stack.length)); cur = stack.join(''); }
    else cur += m[4];
  }
  out.push(cur + '</span>'.repeat(stack.length));
  return out;
}
