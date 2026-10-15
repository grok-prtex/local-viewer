# なんでもローカルビューア（view.a-ef.com）

業務で受け取ったファイルを、**ソフトのインストールなし・サーバーへのアップロードなし**で、ブラウザだけで表示するツールです。「このファイル、開けない」と思ったときに、とりあえずドラッグ＆ドロップする場所を目指しています。

公開先: https://view.a-ef.com

## 対応形式

| 分類 | 形式 | 状態 | 使用ライブラリ |
|---|---|---|---|
| Office | PDF | 対応 | PDF.js（pdfjs-dist） |
| Office | XLSX / XLS / CSV | 対応（値のみ。CSV は UTF-8 / Shift_JIS を自動判別） | SheetJS（xlsx） |
| Office | DOCX | 対応 | docx-preview |
| Office | PPTX | 準備中 | — |
| Mail | EML | 対応（ヘッダー・本文・添付の保存と表示） | postal-mime |
| Mail | MSG | 対応 | @kenjiuno/msgreader |
| CAD | DXF | 対応（線・円・円弧・ポリライン・楕円・ブロック、画層の表示切替。文字・寸法は未表示） | dxf-parser ＋ Three.js（自前描画） |
| CAD | STEP / STP / IGES / IGS | 対応 | occt-import-js（OpenCascade の WebAssembly 版、Web Worker 内で実行）＋ Three.js |
| CAD | STL | 対応 | Three.js STLLoader |
| CAD | DWG | 準備中 | — |
| CAD | 3D PDF（U3D） | 対応（PDF 内の U3D を自前デコーダーで表示、ページ表示と切替） | 自前（Intel U3D Sample Software, Apache-2.0 を参考に移植。NOTICE 参照） |
| CAD | 3D PDF（PRC） | 検出のみ（「この3DPDF（PRC形式）はまだ未対応です」と表示、ページは表示） | — |
| CAD | U3D | 対応（ベースメッシュのみ。プログレッシブ部分は未対応） | 同上 |
| Image | PNG / JPEG / GIF / WebP / AVIF / BMP / ICO / SVG | 対応（ブラウザ標準。SVG は img 要素で表示しスクリプト無効） | — |
| Image | HEIC / HEIF | 対応 | libheif-js（LGPL-3.0、未改変の WASM を /vendor/libheif から別ファイルとして配信） |
| Image | TIFF（複数ページ）/ PSD（合成画像）/ TGA / JPEG XL | 対応 | UTIF.js（MIT）/ ag-psd（MIT）/ Three.js TGALoader / @jsquash/jxl（Apache-2.0） |
| Image | カメラ RAW | 埋め込みプレビュー JPEG を表示（現像はしない） | 自前 |
| Media | MP4 / MOV / WebM / MKV / MP3 / WAV / M4A / OGG / FLAC | ブラウザが再生できる範囲で対応（blob URL） | — |
| Media | AVI / WMV / FLV など | 準備中（コンテナとコーデックを表示）。ffmpeg.wasm は約 30MB で見送り | — |
| Archive | ZIP | 対応（一覧、保存、中の対応ファイルをそのまま表示） | JSZip |

3D ビューアは、回転・移動・拡大縮小・全体表示・ワイヤーフレーム切替・背景の白黒切替と、外形寸法（バウンディングボックス）の表示ができます。

## プライバシーの設計

- ファイルは `File` API でブラウザ内に読み込み、その場で解析して表示します。サーバーには何も送りません。
- 再読み込み対策として、開いたファイルはタブごとのセッション ID（sessionStorage）をキーに IndexedDB へ一時保存します。localStorage・Cookie は使いません。起動時に、閉じたタブ（45 秒以上更新のないセッション）のデータを削除します。「閉じる／消去」ですぐに消去できます。
- 解析ライブラリ、WebAssembly、PDF の CMap・標準フォント、IBM Plex のフォントは、すべてこのサイト自身から配信しています。外部 CDN・解析ツール・広告は使っていません。
- `public/_headers` で厳しい Content-Security-Policy を設定し、ブラウザ側で通信先を強制的に制限しています。
  - `connect-src 'self'`、`default-src 'none'`、`form-action 'none'`、`frame-ancestors 'none'` など。
  - 動画・音声の再生のため `media-src 'self' blob:` を追加しています（ローカルの blob URL のみ）。
  - `/occt-worker.js` だけは、OpenCascade（Emscripten）が内部で `new Function` を使うため `'unsafe-eval'` を許可しています。この Worker も `connect-src 'self'` で、外部への通信はできません。
- a-ef.com ゾーンの Cloudflare Web Analytics が HTML に計測スクリプトを自動挿入しないよう、`Cache-Control: no-transform` を付けています（CSP でも遮断されます）。
- メール本文の HTML は、スクリプトを無効にした sandbox の iframe に表示します。外部画像（開封確認の追跡画像など）は CSP で読み込みを止めます。
- E2E テスト（`e2e/smoke.spec.ts`）で、ファイルを開いた後のすべての通信が同一オリジンへの GET だけで、ファイルの中身や名前を含まないことを確認しています。

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm test           # 形式判定のユニットテスト（vitest）
npm run build      # dist/ に出力（prebuild で WASM などを public/vendor にコピー）
npm run e2e        # Playwright のスモークテスト（vite preview に本番と同じ CSP を適用）
```

テスト用のファイルは `tests/fixtures/` にあります（出典は `SOURCES.txt`）。

## デプロイ

Cloudflare Pages（プロジェクト名 `local-viewer`）に直接アップロードしています。

```bash
npm run build
npx wrangler pages deploy dist --project-name local-viewer --branch main
```

カスタムドメイン `view.a-ef.com` は Pages のカスタムドメインと、a-ef.com ゾーンの CNAME（`view` → `local-viewer.pages.dev`、プロキシ有効）で設定しています。

## 対象外（MVP）

AI 要約、OCR、編集、保存、変換、寸法測定、図面比較、注釈、会員登録。
