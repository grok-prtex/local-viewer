import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Loading, ErrorBox } from '../ui';

export default function DocxViewer({ file }: { file: File }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  useEffect(() => {
    let alive = true; const el = host.current!; el.innerHTML = '';
    renderAsync(file, el, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: true, useBase64URL: true, renderAltChunks: false })
      .then(() => alive && setState('ok')).catch(() => alive && setState('err'));
    return () => { alive = false; };
  }, [file]);
  return (
    <div>
      {state === 'loading' && <Loading>文書を読み込んでいます</Loading>}
      {state === 'err' && <ErrorBox>Word 文書を読み込めませんでした。古い DOC 形式には、現在は対応していません。</ErrorBox>}
      <div className="docx" ref={host} data-testid="docx" />
      {state === 'ok' && <p className="hint">レイアウトは Word と完全には一致しない場合があります。</p>}
    </div>
  );
}
