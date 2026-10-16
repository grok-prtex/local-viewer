import { useState } from 'react';
import type * as THREE from 'three';
import { t } from '../i18n';

export interface TreeNode { name: string; obj: THREE.Object3D; children: TreeNode[]; }

function count(n: TreeNode): number { return n.children.length ? n.children.reduce((a, c) => a + count(c), 0) : 1; }

function Item({ n, depth }: { n: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const [vis, setVis] = useState(n.obj.visible);
  return (
    <li>
      <label>
        {n.children.length ? <button className="twisty" onClick={(e) => { e.preventDefault(); setOpen(!open); }} aria-label={open ? t('閉じる') : t('開く')}>{open ? '▾' : '▸'}</button> : <span className="twisty" />}
        <input type="checkbox" checked={vis} onChange={() => { n.obj.visible = !vis; setVis(!vis); }} />
        <span>{n.name}</span>
      </label>
      {open && n.children.length > 0 && <ul>{n.children.slice(0, 500).map((c, i) => <Item key={i} n={c} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function ModelTree({ root }: { root: TreeNode }) {
  return (
    <aside className="tree" data-testid="model-tree">
      <div className="label mono">PARTS · {count(root)}</div>
      <ul><Item n={root} depth={0} /></ul>
    </aside>
  );
}
