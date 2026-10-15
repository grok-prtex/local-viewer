import { useEffect, useState } from 'react';
import type * as THREE from 'three';
import ThreeView from './ThreeView';
import { loadU3D } from '../u3d/toThree';
import { Loading, ErrorBox } from '../ui';
import type { Pdf3D } from '../pdf3d';

export default function Pdf3DView({ model }: { model: Pdf3D }) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (model.kind !== 'U3D') return;
    let alive = true;
    if (!model.data.length) { setErr('暗号化された 3D PDF のため、3D モデルを取り出せませんでした。'); return; }
    loadU3D(model.data.slice().buffer).then((r) => alive && setObj(r.group))
      .catch((e) => { console.warn('u3d failed', e); if (alive) setErr('3D モデル（U3D）を表示できませんでした。段階的な詳細度（プログレッシブ）付きの U3D など、まだ対応していない書き方の可能性があります。'); });
    return () => { alive = false; };
  }, [model]);
  if (model.kind === 'PRC') return <ErrorBox>この3DPDF（PRC形式）はまだ未対応です</ErrorBox>;
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!obj) return <Loading>3D モデルを解析しています</Loading>;
  return <ThreeView object={obj} />;
}
