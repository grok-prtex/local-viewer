#!/usr/bin/env python3
"""prc.json（prc-rs, MIT, Copyright Kristóf Ralovich）から PRC ビットストリームの読み取り関数（TypeScript）を生成します。
使い方: python3 scripts/prc/gen.py  → src/prc/gen.ts"""
import json, re, os
here = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(here, 'prc.json')))
consts = json.load(open(os.path.join(here, 'consts.json')))
S = d['structures'][0]
builtins = set(d['builtins']); vbr1 = set(d['vbr_1param']); vbr2 = set(d['vbr_2param'])
flat = {}
for en, vals in consts.items():
    for k, v in vals.items(): flat.setdefault(k, v)

def tr(expr, fields):
    e = expr.strip()
    # if A { B } else { C }
    m = re.match(r'^if\s+(.+?)\s*\{\s*(.+?)\s*\}\s*else\s*\{\s*(.+?)\s*\}$', e)
    if m:
        return '((%s) ? (%s) : (%s))' % (tr(m.group(1), fields), tr(m.group(2), fields), tr(m.group(3), fields))
    e = re.sub(r'if\s+([^{}]+?)\s*\{\s*([^{}]+?)\s*\}\s*else\s*\{\s*([^{}]+?)\s*\}', lambda m: '((%s) ? (%s) : (%s))' % (m.group(1), m.group(2), m.group(3)), e)
    e = e.replace('self.', '')
    e = re.sub(r'\s+as\s+(u8|u16|u32|u64|i8|i16|i32|i64|usize|f64|f32)\b', '', e)
    e = re.sub(r'\b(\d+(?:\.\d+)?)_?(usize|u32|u8|i8|i32|f64)\b', r'\1', e)
    e = re.sub(r'(\w+)::(\w+)', lambda m: str(consts[m.group(1)][m.group(2)]) if m.group(1) in consts else m.group(0), e)
    e = re.sub(r'(?<!&)&(?=[A-Za-z_])', '', e)
    e = e.replace('.len()', '.length')
    e = re.sub(r'\.value\b', '', e)
    e = re.sub(r'\.a\b', '', e)
    e = e.replace('_ctx.', 'ctx.')
    e = re.sub(r'\bhave_bbox\(', 'ctx.have_bbox(', e)
    def tok(m):
        t = m.group(0); start = m.start()
        if start > 0 and e[start-1] == '.': return t
        if t in fields: return 'o.' + t
        if t in flat: return str(flat[t])
        return t
    e = re.sub(r'\b[A-Za-z_]\w*\b', tok, e)
    return e

def reader(f, fields):
    dt = f['data_type']
    if dt in builtins:
        if 'vbr' in f and dt in vbr1: return 'B.%s(r, %s)' % (dt, tr(str(f['vbr']), fields))
        if 'vbr' in f and dt in vbr2: return 'B.%s(r, %s, %s)' % (dt, tr(str(f['vbr']), fields), tr(str(f['tol']), fields))
        return 'B.%s(r)' % dt
    return 'r_%s(r, ctx)' % dt

def on_set(code, fields):
    out = []
    ifs = []
    def keep_if(m):
        ifs.append(m.group(0)); return '@IF%d@' % (len(ifs) - 1)
    code = re.sub(r'if\s+[^{};]+\{[^{}]*\}', keep_if, code)
    for stmt in re.split(r'[;\n]', code):
        stmt = re.sub(r'@IF(\d+)@', lambda m: ifs[int(m.group(1))], stmt)
        s = stmt.strip().rstrip(';')
        if not s: continue
        if s.startswith('_ctx.'):
            if '=' in s and not '==' in s:
                lhs, rhs = s.split('=', 1)
                rhs = rhs.strip().replace('.clone()', '')
                out.append('%s = %s;' % (tr(lhs, fields), tr(rhs, fields)))
            else:
                out.append(tr(s, fields) + ';')
        elif s.startswith('if ') and '_ctx.' in s:
            m = re.match(r'^if\s+(.+?)\s*\{\s*(.+?);?\s*\}$', s)
            if m: out.append('if (%s) { %s; }' % (tr(m.group(1), fields), tr(m.group(2), fields)))
    return ' '.join(out)

lines = ['// 自動生成（scripts/prc/gen.py）。編集しないでください。',
         '// 元データ: prc-rs の prc.json（MIT License, Copyright (c) 2025,2026 Kristóf Ralovich）',
         '/* eslint-disable */', '// @ts-nocheck', "import { B } from './bits';", '']
for name, v in S.items():
    if 'byte_aligned' in v: continue
    fields = set(f['name'] for f in v['fields'])
    flist = v['fields']
    lines.append('export function r_%s(r, ctx) {' % name)
    lines.append('  const o = { _t: %s };' % json.dumps(name))
    if 'on_enter' in v and v['on_enter'].strip().startswith('_ctx.'):
        lines.append('  ' + on_set(v['on_enter'], fields))
    if 'on_enter' in v and 'unimplemented' in v['on_enter'] or 'return Err' in v.get('on_enter', ''):
        lines.append("  throw new Error('unsupported %s');" % name)
    call_se = name.startswith('PRC_TYPE_')
    has_ud = any(f['name'] == 'user_data' and f['data_type'] == 'UserData' for f in flist)
    se_after = flist[-2]['name'] if (len(flist) >= 2 and has_ud) else (flist[-1]['name'] if flist else None)
    for f in flist:
        fn = f['name']
        cond = tr(f['condition_rust'], fields) if 'condition_rust' in f else None
        body = []
        if 'eligible_type_ids' in f:
            body.append('const tid = r.peek(() => B.%s(r));' % f['data_type'])
            body.append('switch (tid%s) {' % ('.value' if f['data_type'] == 'CompressedEntityType' else ''))
            kind = consts[f['eligible_type_kind']]
            for eti in f['eligible_type_ids']:
                body.append('  case %d: o.%s = r_%s(r, ctx); break;' % (kind[eti[0]], fn, eti[0]))
            body.append("  default: throw new Error('%s: unknown subtype ' + JSON.stringify(tid));" % name)
            body.append('}')
        elif 'is_vec' in f:
            body.append('const n = %s; if (n > 50000000 || n < 0) throw new Error("bad size"); const a = new Array(n);' % tr(str(f['size']), fields))
            body.append('for (let i = 0; i < n; i++) a[i] = %s;' % reader(f, fields))
            body.append('o.%s = a;' % fn)
        elif 'multiplicity' in f:
            body.append('const a = []; for (let i = 0; i < %d; i++) a.push(%s); o.%s = a;' % (f['multiplicity'], reader(f, fields), fn))
        else:
            body.append('o.%s = %s;' % (fn, reader(f, fields)))
            if 'expected_value' in f:
                ev = consts[f['expected_value'][0]][f['expected_value'][1]]
                body.append("if (o.%s !== %d) throw new Error('%s.%s: expected %d got ' + o.%s);" % (fn, ev, name, fn, ev, fn))
        if 'on_set' in f:
            s = on_set(f['on_set'], fields)
            if s: body.append(s)
        if cond:
            lines.append('  if (%s) { %s }' % (cond, ' '.join(body)))
        else:
            lines.append('  { %s }' % ' '.join(body))
        if call_se and fn == se_after:
            lines.append('  ctx.se(r, %d);' % consts['PrcType'].get(name, -1))
            call_se = False
    if 'on_leave' in v:
        s = on_set(v['on_leave'], fields)
        if s: lines.append('  ' + s)
    lines.append('  return o;')
    lines.append('}')
    for al in v.get('alias', []):
        lines.append('export const r_%s = r_%s;' % (al, name))
lines.append('export const PRC_TYPE = %s;' % json.dumps(consts['PrcType']))
open(os.path.join(here, '..', '..', 'src', 'prc', 'gen.ts'), 'w').write('\n'.join(lines) + '\n')
print('ok', len(lines))
