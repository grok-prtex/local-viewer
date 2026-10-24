import { useEffect, useState } from 'react';
import { maybeInflate, scanPickle, type PickleScan } from '../pickleScan';
import { Loading, ErrorBox } from '../ui';
import { t } from '../i18n';

export default function JoblibViewer({ file }: { file: File }) {
  const [scan, setScan] = useState<PickleScan | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = new Uint8Array(await file.arrayBuffer());
      const { bytes, compression } = await maybeInflate(raw);
      if (bytes[0] !== 0x80 && bytes[0] !== 0x5d && bytes[0] !== 0x7d && bytes[0] !== 0x28) {
        throw new Error('not-pickle');
      }
      const s = scanPickle(bytes, compression);
      if (alive) setScan(s);
    })().catch(() => alive && setErr(t('joblib / pickle として読めませんでした。壊れているか、未対応の圧縮形式の可能性があります。')));
    return () => { alive = false; };
  }, [file]);
  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!scan) return <Loading>{t('ヘッダーを解析しています（コードは実行しません）')}</Loading>;
  return (
    <div className="cadinfo" data-testid="joblib">
      <div className="state notice">
        {t('joblib / pickle は任意のコードを実行できる形式です。このビューアでは')}<strong>{t('復元（実行）は一切しません')}</strong>{t('。プロトコルと、ファイル内に書かれている型名・文字列・数値だけを表示します。中身を使うときは、信頼できる環境の Python で開いてください。')}
      </div>
      <dl className="mail-head">
        <dt>{t('pickle プロトコル')}</dt><dd className="mono">{scan.protocol ?? t('不明')}</dd>
        <dt>{t('圧縮')}</dt><dd className="mono">{t(scan.compression)}</dd>
        <dt>{t('オペコード数')}</dt><dd className="mono">{scan.ops.toLocaleString()}</dd>
        <dt>{t('状態')}</dt><dd>{scan.note}</dd>
      </dl>
      {scan.globals.length > 0 && (
        <div className="attachments">
          <div className="label mono">{t('参照している型')} · {scan.globals.length}</div>
          <ul data-testid="joblib-types">{scan.globals.map((g) => <li key={g}><span className="att-name mono">{g}</span></li>)}</ul>
        </div>
      )}
      {scan.strings.length > 0 && (
        <div className="attachments">
          <div className="label mono">{t('文字列')} · {scan.strings.length}</div>
          <ul data-testid="joblib-strings">{scan.strings.map((g, i) => <li key={i}><span className="att-name mono">{g}</span></li>)}</ul>
        </div>
      )}
      {scan.numbers.length > 0 && (
        <div className="attachments">
          <div className="label mono">{t('数値')} · {scan.numbers.length}</div>
          <p className="mono" data-testid="joblib-nums">{scan.numbers.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
