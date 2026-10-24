# Office 形式（Word / Excel / PowerPoint）と DWG — 非対応（削除済み）

更新: 2026-10-24（JST）／対象: なんでもローカルビューア（view.a-ef.com）

## 結論
- **Word・Excel・PowerPoint・DWG は対応しません。アプリから削除しました。**
- ユーザー指示（2026-10-24）：「ほぼ完璧（レイアウトが正確・日本語が正しい・公開サンプルすべてで見やすさ／わかりやすさ／操作しやすさが 3 以上）でなければ、部分的な版は出さずに完全に外す」。
- 対応形式一覧・準備中の案内・テスト・受け入れ表から外し、`.docx` `.doc` `.xlsx` `.xlsm` `.xls` `.ods` `.pptx` `.ppt` `.dwg` などは **ほかの未対応ファイルと同じ扱い**（「この形式のファイルには、まだ対応していません」）です。ZIP や OLE としても開きません。
- CSV / TSV / Parquet は引き続き表示できます。見たい場合は元ソフトで PDF または CSV に書き出してください。DWG は DXF に書き出すと表示できます。

## 判定の根拠（2026-10-24、公開サンプル 22 件・LibreOffice の PDF を基準に比較）
| 形式 | 試した方法 | 結果 |
|---|---|---|
| Word（DOCX） | docx-preview（Apache-2.0） | 厚労省・東京労働局の様式 10 件。単純な様式は読めるが、浮動表・テキストボックス・横向きの協定届（東京労働局 001596131 / 001639341）は配置が大きく崩れ、明朝体も出ない。基準未達 → **削除** |
| Excel（XLSX / XLSM） | ExcelJS（MIT）＋自前グリッド | 厚労省の帳票 3 件すべてで、列幅・はみ出し表示・縦書き・均等割付・縦位置・斜線が Excel / LibreOffice と違う。パスワード付きファイルは案内が出ず止まる。基準未達 → **削除** |
| Excel（XLS / ODS） | SheetJS Community（Apache-2.0） | 書式を読めず値のみ。基準未達 → **削除** |
| PowerPoint（PPTX） | pptx-preview / PPTXjs を調査 | pptx-preview は README でソースの再配布・改変を禁じており寛容ライセンスと言えない。PPTXjs（MIT）は jQuery 依存で図形・テーマの再現が弱い。→ **削除** |
| DOC / PPT（古い形式） | — | ブラウザで動く寛容ライセンスのレンダラがない → 追加しない |
| DWG | LibreDWG | GPL のため同梱しない → **削除** |

削除に合わせて ExcelJS・docx-preview の依存、`xlsx-worker.js`、その CSP 設定も外しました。
