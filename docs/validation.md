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
