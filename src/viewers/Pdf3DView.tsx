import { useEffect, useState, useRef } from 'react';
import type * as THREE from 'three';
import ThreeView from './ThreeView';
import ModelTree, { type TreeNode } from './ModelTree';
import { loadU3D } from '../u3d/toThree';
import { loadPRC } from '../prc/toThree';
import { ErrorBox } from '../ui';
import { Progress } from '../progress';
import type { Pdf3D } from '../pdf3d';
import { t } from '../i18n';

export default function Pdf3DView({ model }: { model: Pdf3D }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [pct, setPct] = useState(0);
  const job = useRef<{ cancel?: () => void }>({});
  useEffect(() => {
    let alive = true;
    setObj(null); setTree(null); setErr(''); setNote(''); setPct(0);
    if (!model.data.length) { setErr(t('暗号化された 3D PDF のため、3D モデルを取り出せませんでした。')); return; }
    const cancelled = (e: unknown) => String((e as Error)?.message) === 'cancelled';
    if (model.kind === 'U3D') {
      loadU3D(model.data.slice().buffer, job.current).then((r) => alive && setObj(r.group))
        .catch((e) => { if (cancelled(e)) { if (alive) setErr(t('読み込みをキャンセルしました。')); return; } console.warn('u3d failed', e); if (alive) setErr(t('3D モデル（U3D）を表示できませんでした。段階的な詳細度（プログレッシブ）付きの U3D など、まだ対応していない書き方の可能性があります。')); });
    } else {
      loadPRC(model.data.slice().buffer, job.current, (p) => alive && setPct(p)).then((r) => {
        if (!alive) return;
        if (r.brepOnly) { setErr(t('この 3D PDF（PRC 形式）には表示用の三角形メッシュが含まれておらず、厳密形状（B-rep）だけで書かれています。B-rep の表示には対応していません。作成元のソフトで「テッセレーション（メッシュ）を含める」設定にして書き出すと表示できます。')); return; }
        if (r.stats.verified < r.stats.meshes) setNote(t('一部の部品（{0} / {1}）は形を完全には復元できなかったため、復元できた範囲だけを表示しています。', String(r.stats.meshes - r.stats.verified), String(r.stats.meshes)));
        setObj(r.group); setTree(r.tree);
      }).catch((e) => { if (cancelled(e)) { if (alive) setErr(t('読み込みをキャンセルしました。')); return; } console.warn('prc failed', e); if (alive) setErr(t('3D モデル（PRC）を表示できませんでした。まだ対応していない書き方の可能性があります。')); });
    }
    return () => { alive = false; job.current.cancel?.(); };
  }, [model]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!obj) return <Progress p={model.kind === 'U3D' ? { stage: '解析中', detail: t('U3D を展開しています') } : { stage: '解析中', pct: pct * 100, detail: t('PRC を展開しています') }} onCancel={() => job.current.cancel?.()} />;
  return (
    <div data-testid="pdf3d-view" data-kind={model.kind}>
      {note && <p className="hint" data-testid="prc-note">{note}</p>}
      <ThreeView object={obj} side={tree ? <ModelTree root={tree} /> : undefined} />
    </div>
  );
}
