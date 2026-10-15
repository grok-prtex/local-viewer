# なんでもローカルビューア（view.a-ef.com）

業務で受け取ったファイルを、**ソフトのインストールなし・サーバーへのアップロードなし**で、ブラウザだけで表示するツールです。「このファイル、開けない」と思ったときに、とりあえずドラッグ＆ドロップする場所を目指しています。

- 公開先: https://view.a-ef.com
- ライセンス: MIT（同梱ライブラリはそれぞれのライセンス。`LICENSE` / `NOTICE` / `tests/fixtures/SOURCES.txt` を参照）
- 画面下の「ソースコード（GitHub）」の横に、公開中のビルドのコミットを表示しています。

## テキスト・ソースコード

TXT / LOG / INI などは文字コードを自動判定します（UTF-8 / UTF-16 / Shift_JIS / EUC-JP）。Markdown は DOMPurify で無害化して表示し、外部の画像は読み込みません。JSON / XML は整形表示、ソースコード（Python / JS / TS / C / C# / Java / Go / Rust / VBA / ST・SCL / G コードなど）は同梱の highlight.js でハイライトします。行番号・折り返し・Ctrl+F 検索に対応しています。HTML は `sandbox` 付きの iframe（スクリプト無効、`default-src 'none'`）の中で表示します。ZIP はフォルダーツリーで中身を見られます。

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


## プライバシーの設計（レビューする方へ）

### 基本方針
1. ファイルは `File` API でブラウザ内に読み込み、JavaScript / WebAssembly でその場で解析します。**ファイルの中身・名前をサーバーへ送る処理はありません**（アップロード用の API もサーバー側の処理もありません。サイトは静的ファイルだけです）。
2. 解析ライブラリ、WASM、PDF の CMap・標準フォント、IBM Plex のフォントは、すべてこのサイト自身から配信します。CDN・解析ツール・広告は使いません。
3. 上の 1・2 が守られていることを、ブラウザの CSP（Content-Security-Policy）で**強制**しています。コードに不具合があっても、外部オリジンへの通信はブラウザが止めます。

### CSP の全文（`public/_headers`）
すべてのパス:
```
default-src 'none'; media-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src 'self' blob: data:; child-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; manifest-src 'self'
```
`/occt-worker.js`（STEP / IGES を読む Web Worker）だけ:
```
default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; connect-src 'self'
```

| 指定 | 理由 |
|---|---|
| `default-src 'none'` | 明示していない種類の読み込みは、すべて禁止します。 |
| `connect-src 'self'` | fetch / XHR / WebSocket は自サイトのみ。自サイトにもファイルを受け取る仕組みはありません。 |
| `script-src 'self' 'wasm-unsafe-eval'` | スクリプトは自サイトのみ。`'wasm-unsafe-eval'` は WebAssembly（OpenCascade、libheif、JPEG XL、PDF.js の一部）のコンパイルに必要です。JavaScript の eval は許可していません。 |
| `/occt-worker.js` の `'unsafe-eval'` | **例外はここだけです。** OpenCascade を Emscripten で WASM 化した occt-import-js が、内部で `new Function` を使うためです。この Worker の CSP は `default-src 'none'` と `connect-src 'self'` なので、外部とは通信できません。メイン画面には `'unsafe-eval'` を許可していません。 |
| `media-src 'self' blob:` | 動画・音声を、ブラウザ内で作った `blob:` URL で再生するためです。外部の URL は対象外です。 |
| `img-src 'self' data: blob:` | 復号した画像や PDF の表示用です。メール本文の外部画像（開封確認の追跡画像など）は、ここで読み込みを止めます。 |
| `worker-src 'self' blob:` | 解析用の Web Worker（PDF.js、OpenCascade、U3D、HEIC）用です。 |
| `frame-src 'self' blob: data:` | メール本文を、スクリプトを無効にした sandbox の iframe（srcdoc）に表示するためです。 |
| `style-src 'self' 'unsafe-inline'` | docx-preview と React のインライン style 用です。スタイルからは通信できません（`img-src` / `font-src` の制限を受けます）。 |
| `form-action 'none'` `base-uri 'none'` `object-src 'none'` `frame-ancestors 'none'` | フォーム送信・base の書き換え・プラグイン・他サイトへの埋め込みを禁止します。 |

### Cloudflare Web Analytics の扱い
このドメイン（a-ef.com ゾーン）では Cloudflare Web Analytics が有効なため、通常は HTML に `static.cloudflareinsights.com` の計測スクリプトが自動で挿入されます。このサイトでは次の 2 つで止めています。
- 全パスに `Cache-Control: no-transform` を付け、Cloudflare に HTML を書き換えさせません（自動挿入されないことを E2E テストで確認しています）。
- 万一挿入されても、CSP の `script-src 'self'` が外部スクリプトの実行を止めます。

### ブラウザ内での保存（IndexedDB のタブ単位セッション）
再読み込みしても表示が消えないよう、開いたファイルを**このタブの間だけ**保存します（`src/session.ts`）。
- タブごとのランダムなセッション ID（`crypto.randomUUID()`）を `sessionStorage` に保存します。sessionStorage はタブを閉じると消えます。
- ファイル本体（`File` / `Blob`）・名前・ZIP やメールから開いた階層は、IndexedDB（DB 名 `local-viewer-session`）に、このセッション ID をキーにして保存します。`localStorage` と Cookie は使いません。
- 開いている間は 15 秒ごとに更新時刻を記録し、**起動するたびに、ほかのセッションのうち 45 秒以上更新がないもの（閉じたタブ）を削除**します。再読み込みと、タブを閉じたことはブラウザでは見分けられないため、閉じたときにはすぐ消さず、次に開いたときに消します。
- 画面の「閉じる／消去」を押すと、すぐに削除します。

## 公開サイトがこのソースと同じかを確かめる手順
ビルドは再現できるようにしています（Node.js 20.19.2、`package-lock.json` 固定、ビルドしたコミットの埋め込み）。

1. 画面下に表示されたコミット（例: `1a2b3c4d5e6f`）を確認します。
2. 同じコミットを取得してビルドします。
   ```bash
   git clone https://github.com/grok-prtex/local-viewer && cd local-viewer
   git checkout <コミット>
   npm ci
   npm run build        # 最後に dist の全ファイルの SHA-256 を表示し、dist/build-manifest.sha256 に保存します
   ```
3. 公開サイトと比べます。
   ```bash
   node scripts/verify-live.mjs https://view.a-ef.com
   ```
   すべてのファイルをダウンロードして SHA-256 を比べ、`一致 N / 不一致 0` と表示されれば同じです。公開中の `/build-manifest.sha256` とも比べ、CSP ヘッダーの値も表示します（`_headers` はファイルとしては配信されないため、ヘッダーで確認します）。CDN のキャッシュに古いファイルが残っていても正しく比べられるように、各リクエストには `?verify=<時刻>` を付けています。

キャッシュ方針：ファイル名にハッシュが入る `/static/*` は 1 年 immutable、それ以外（HTML・Worker・WASM など名前が固定のファイル）は `no-cache` で毎回再検証します。Worker はさらに `?v=<コミット>` 付きで読み込むため、デプロイ直後でも古い Worker は使われません。
4. リリースごとのハッシュ一覧は `releases/<コミット>.sha256` にもあります。GitHub Actions 用のワークフロー（`ci/github-actions-build.yml`、同じ手順でビルドしてハッシュを表示）を用意しています。`.github/workflows/` に置くと push のたびに動きます（現在のデプロイ用トークンには workflow 権限がないため、有効化は保守者が行います）。

## 開発
```bash
npm ci
npm run dev        # 開発サーバー
npm test           # ユニットテスト（形式判定、U3D 復号など）
npm run build      # dist/ に出力し、ハッシュ一覧を作ります
npx playwright test   # E2E（vite preview に本番と同じ CSP を適用。外部通信がないことも確認）
```

## デプロイ
```bash
npm run build
npx wrangler@3 pages deploy dist --project-name local-viewer --branch main
```
カスタムドメイン `view.a-ef.com` は、Cloudflare Pages のカスタムドメインと CNAME（`view` → `local-viewer.pages.dev`）で設定しています。

## 対象外（MVP）
AI 要約、OCR、編集、保存、変換、寸法測定、図面比較、注釈、会員登録。
