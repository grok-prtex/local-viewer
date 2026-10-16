import { useEffect, useState } from 'react';
import { probeMedia, type MediaKind } from '../media';
import { ErrorBox } from '../ui';
import { t } from '../i18n';

export default function MediaViewer({ file, kind }: { file: File; kind: MediaKind }) {
  const [url, setUrl] = useState('');
  const [fail, setFail] = useState<{ container: string; codecs: string[] } | null>(null);
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); setFail(null); return () => URL.revokeObjectURL(u); }, [file]);
  const onError = async () => setFail(probeMedia(new Uint8Array(await file.slice(0, 4 << 20).arrayBuffer())));
  if (fail) return (
    <ErrorBox>
      <div>{kind === 'video' ? t('この動画は、お使いのブラウザでは再生できない形式です。') : t('この音声は、お使いのブラウザでは再生できない形式です。')}</div>
      <div className="mono" style={{ marginTop: 8 }} data-testid="media-info">{t('コンテナ:')} {t(fail.container)}{fail.codecs.length ? t(' ／ コーデック: {0}', fail.codecs.join(', ')) : ''}</div>
      <div style={{ marginTop: 8, color: 'var(--ink-2)' }}>{t('MP4（H.264 / AAC）や WebM に変換されたファイルであれば再生できます。このサイトでは変換は行いません。')}</div>
    </ErrorBox>
  );
  if (!url) return null;
  return kind === 'video'
    ? <video className="media" src={url} controls playsInline preload="metadata" onError={onError} data-testid="video" />
    : <audio className="media-audio" src={url} controls preload="metadata" onError={onError} data-testid="audio" />;
}
