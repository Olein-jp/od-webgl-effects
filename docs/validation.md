# 検証結果と制限

検証日：2026-11-12（日本時間）

## 実装した Phase 1

- Group / Cover / Column / Columns の属性拡張、スタイルサイドバー、日本語 UI。
- Aurora / Fluid Gradient / Waves、3種類のパレットプリセット、各エフェクトの詳細設定。
- テーマカラー参照、カスタムカラー、2〜5色、速度・強度・不透明度。
- 編集画面の静止・選択時ライブ・停止プレビュー、設定変更時の既存インスタンス更新。
- 公開画面の描画、CSS 背景色フォールバック、Cover メディア設定の保持。
- 画面外・非表示タブ・Reduced Motion・FPS・DPR・モバイル品質・コンテキスト上限の制御。
- Canvas/GPU リソースの解放、コンテキスト喪失からの復帰、ページキャッシュ復帰時の再初期化。
- PHP の4種類のフィルター、ルートアダプター、内部エフェクト／レンダラー登録基盤。
- バンドル済みアセット、翻訳 PO/MO/JSON、OGL ライセンス、配布 ZIP の同梱チェック。

## 実行した確認

| 対象 | 結果 |
| --- | --- |
| JS 単体テスト | 9件成功。設定検証・登録拒否・10個の描画上限・更新時再利用・Reduced Motion・非表示タブ・FPS・破棄 |
| PHP 単体テスト | 10項目成功。型・数値・色・バージョン・対応ブロック・フィルター |
| WordPress 7.1.4 / PHP 8.4.8 | PHP 統合18項目成功 |
| WordPress 6.9 / PHP 8.4.8 | PHP 統合18項目成功 |
| WordPress 7.1.4 / Chromium・Firefox・WebKit | 各4件、計12件の操作・描画テスト成功 |
| WordPress 6.9 日本語環境 / Chromium | 同4件成功。日本語パネル・翻訳 JSON も確認 |
| Chromium / WordPress 7.1.4 の画像比較 | 14枚一致。編集画面3サイズ、公開3エフェクト×3サイズ、Reduced Motion、WebGL 無効 |
| ビルド／npm lock | ビルド成功、`npm ci --ignore-scripts` による再インストール成功 |
| PHP / Composer | WPCS、構文、Composer 定義・ロック整合性の確認成功 |
| 配布 | 本番 Composer 依存のみの ZIP 生成成功。JS/CSS/スキーマ/翻訳/ライセンスの同梱と開発ファイル除外を確認 |

ブラウザテストは、保存・再編集・ブロック検証・Undo・複製・削除、リンク操作、1440/768/390px、背景位置とサイズ、WebGL/JavaScript 無効、Reduced Motion、10個配置、コンテキスト喪失、ページ復帰イベントを対象にしています。シェーダーは時刻ゼロの静止設定で撮影し、フォントと最小高さを固定して比較の再現性を確保しています。

Docker 接続はこのセッションでは拒否されたため、ローカルの使い捨て WordPress＋公式 SQLite Database Integration で統合・ブラウザ検証を行いました。既存サイトのデータや設定は変更していません。

## 残る確認・既知の制限

### Issue #1 の再確認（2026-11-12）

- 基準コミット `c81e11eb832bb18c7fcabb7d1f1a35496d80cbe1` は GitHub API から参照できました。
- 同コミットに紐づく Actions 実行一覧は空でした。build / integration の成功は未確認です。
- `docker info` は Docker ソケットへの `permission denied` で失敗しました。PHP 8.1 / MySQL の検証は未実施です（ホスト PHP は 8.4.8）。
- Safari / Edge 製品版、iOS / Android 実機、低性能 GPU、GitHub Release からの管理画面更新は引き続き未確認です。タグ・Release は作成していません。
- `git update-index --refresh` は終了コード0ですが、`git add README.md` は `.git/index.lock: Operation not permitted` で失敗しました。refresh の成功だけではコミット可能と判断できません。このセッションでは追加の実行承認も無効です。

Issue #1 は未完了として扱います。以下のチェックを実行できる環境で補完し、結果を記録してから Phase 2 のリリースを判定します。

| 残る項目 | 再現手順・記録する内容 |
| --- | --- |
| PHP 8.1 / MySQL | CI の integration 2環境（6.9 / latest）で統合・Chromiumテストの結果と実行URLを記録 |
| 配布と更新 | 本番依存入りZIPの新規導入、有効化、無効化後の保持を確認。検証用バージョンを揃えてタグを作成し、CI成功後のRelease添付ZIPから管理画面更新を確認 |
| 実機 | Safari / Edge / iOS / Android のOS・ブラウザ・端末を記録し、背景・リンク・リサイズ・Reduced Motionを確認 |
| 性能 | 同一条件で背景1・3・10個、ビューポート、品質、DPR、フレーム時間、同時コンテキスト数、Canvas解像度を記録。低性能端末でも測定 |

参照: https://github.com/Olein-jp/od-webgl-effects/commit/c81e11eb832bb18c7fcabb7d1f1a35496d80cbe1

### Issue #2 の実装・検証（2026-11-12）

- 共通数値コントロールと既定パレットを `schemas/common.json` に集約。7種類の型のPHP/JS検証、未知キー除外、厳密な数値・色検証、切替時の保持ルールを実装。詳細は `docs/settings.md`。
- JS単体30件、PHP単体32項目が成功。PHP 8.4.8 + SQLite上のWordPress 6.9 / 7.1.4の統合テストは各39項目が成功。共通入力例、各エフェクトの保存・再解析・サーバー出力を含む。
- WPCS、ビルドが成功。共通スキーマを配布必須ファイルに追加。本番依存の一時ステージでZIP生成と同梱を確認（56ファイル）。使用した本番依存の全バージョンは `composer.lock` と一致。作業ツリーの開発依存は変更していない。
- 保存・再編集・Undo/Redoのブラウザテストを追加。ただしPHP検証サーバーは `Failed to listen on 127.0.0.1:8899 (reason: Operation not permitted)` で起動できず、追加ブラウザテストは未実行。Issue #2も完了扱いにしない。
- Issueごとのコミットが必要なため、#3以降の実装へ進む前にGit書き込み制限の解消が必要。今回の変更は未コミット。

### 引き継ぎ時の再確認（2026-11-12）

- 既存の未コミット変更を保持し、GitHub連携でIssue #10と#2の本文を確認。推奨順は #2 → #3 → #8 → #4 / #5 → #6 / #7 / #9。#1の未確認項目は並行して補完する。
- `git update-index --refresh` は変更済みファイルの `needs update` を報告。`git add -n README.md` は `.git/index.lock: Operation not permitted` で失敗。ステージ・コミットは未実施。このセッションの承認設定ではサンドボックス外実行の追加承認を要求できない。
- `gh --version` は2.93.0。`gh auth status` はトークン無効と報告し、`gh issue view 10 --repo Olein-jp/od-webgl-effects` は `error connecting to api.github.com` で失敗。通信制限もあるため、トークン自体の失効は確定できない。GitHub連携によるIssue取得は成功した。
- `docker info` はソケット接続の `permission denied` で失敗。`php -S 127.0.0.1:8899 -t /tmp/od-webgl-wordpress` はlistenの `Operation not permitted` で失敗。追加ブラウザテストは引き続き未実行。
- JS単体30件、PHP単体32項目、PHP 8.4.8 + SQLite上のWordPress 6.9 / 7.1.4統合各39項目を再実行し成功。ビルド、WPCS（8ファイル）、`git diff --check` も成功。
- Issue #1 / #2は未完了。Issueごとのコミットが作成できないため、#3以降の実装は未着手のままとした。push・タグ・Release作成・Issueのクローズも行っていない。

### コミット・プッシュ時の再確認（2026-11-12）

- GitHub CLI の認証と対象リポジトリの push 権限を確認。通常実行では `.git` への書き込みが拒否されたが、承認付きの一時ファイル作成・削除は成功した。過去のセッションに記載した制限と区別する。
- JS単体30件、PHP単体32項目、WPCS、Composer定義検証を再実行し成功。既存のIssue #2の変更をコミット対象とし、Issueのクローズ・タグ・Release作成は行わない。
- 今回はWordPress統合・ブラウザテストを再実行していない。上記の未確認項目は引き続き残る。

### 引き続き残る制限

- PHP 8.1 の実行確認と、MySQL／Docker 上での統合確認はローカルでは未実施。CI に PHP 8.1 と WordPress 6.9／最新版の wp-env 検証ジョブを追加しましたが、リモート Actions はまだ実行していません。
- WebKit は Safari のレンダリングエンジンの確認であり、Safari／Edge の製品版や iOS／Android 実機の確認ではありません。
- 低性能 GPU でのフレーム時間・消費電力の定量測定は未実施。コンテキスト上限・DPR・ピクセル面積・FPS と停止動作を確認しています。
- 1文書につき同時に最大4コンテキストです。上限を超えるブロックは設定された背景色を表示します。エディターではライブ選択を優先します。
- 既存メディアとの同時合成、画像フォールバック、独立した可読性オーバーレイ UI、追加エフェクト、外部 JS 用 API の互換性保証は実装範囲外です。文字色は通常のブロック設定で調整してください。
- 3種類のエフェクトは1つのフロントエンドバンドルに同梱しています。エフェクト単位の動的読み込みは後続対応です。
- カスタムブロックのルートコンテナーと PHP アダプターは対応済みですが、ルート以外へのエディター挿入位置を変更する一般公開 API は後続対応です。
- フォールバック色と通常の WordPress 背景色は別の設定です。プラグイン無効化後には通常の背景色が表示されます。
- GitHub への push・タグ作成・Release 公開、管理画面からの実際のバージョン更新テストは未実施です。

## 一次資料

- WordPress Block Filters: https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/
- WordPress HTML API: https://developer.wordpress.org/reference/classes/wp_html_tag_processor/
- JavaScript 翻訳: https://developer.wordpress.org/reference/functions/wp_set_script_translations/
- 翻訳 JSON マッピング: https://developer.wordpress.org/cli/commands/i18n/make-json/
- OGL: https://github.com/oframe/ogl
- SQLite Database Integration: https://wordpress.org/plugins/sqlite-database-integration/
