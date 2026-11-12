# OD WebGL Effects

WordPress ブロックの WebGL 背景エフェクトを開発するための最小構成です。
現時点ではプラグインの起動・翻訳・GitHub 更新を実装しています。背景エフェクトやエディター UI は今後実装します。

## 要件とセットアップ

- WordPress 6.8 以上、PHP 7.4 以上（開発環境は互換性確認用に PHP 7.4）
- Node.js 22 以上、npm 10 以上、Composer 2、Python 3
- Docker Desktop（wp-env 起動時）

```sh
npm ci
composer install
npm run env:start
```

サイト: http://localhost:8888 / 管理画面: http://localhost:8888/wp-admin/
wp-env の標準ログイン: `admin` / `password`（ローカル開発専用）。
`npm run env:stop` で停止、`npm run env:cli -- plugin list` で WP-CLI を実行できます。
ポートなどの個人設定は Git 管理外の `.wp-env.override.json` に記載してください。

JavaScript の実装を始める段階でビルド環境を追加します。
wp-env 10.36.0 は現在のローカル Node.js と互換性があり、Docker 開発に必要な依存のみの版として固定しています。

## コードチェック

```sh
composer validate --strict
composer lint
php -l od-webgl-effects.php
```

WPCS は `phpcs.xml.dist` で管理します。PHP ファイルを追加するときは検査対象の `file` も追加してください。
`composer format` で自動整形できます。
CI は上記チェックと翻訳生成、配布 ZIP 作成を実施します。

## 多言語化

テキストドメインは `od-webgl-effects`、翻訳ファイルは `languages/` に置きます。
PHP の表示文字列には `__()` / `esc_html__()` などを使用します。
英語を原文とし、日本語の PO・MO を同梱しています。

```sh
npm run i18n:pot
# POT を使って各言語の PO を翻訳・更新
npm run i18n:mo
```

ファイル名は `od-webgl-effects-ja.po` / `.mo`、他言語も同じ規則です。
JavaScript の実装時は `@wordpress/i18n` と `wp_set_script_translations()`、翻訳 JSON 生成を追加してください。

## 配布と管理画面からの更新

[WP GitHub Plugin Updater](https://github.com/inc2734/wp-github-plugin-updater) を Composer で導入しています。
公開 GitHub リポジトリ `Olein-jp/od-webgl-effects` の最新安定版 Release を確認します。
非公開リポジトリの認証はこの構成には含みません。
初回は Releases の **od-webgl-effects.zip** を WordPress にインストールしてください。
更新先も同じ Release 添付 ZIP を指定し、Composer の本番依存を含めます。
GitHub が自動生成する Source code ZIP はインストールに使わないでください。

1. `od-webgl-effects.php` の Version、`package.json` の version、`readme.txt` の Stable tag を揃える。
2. 必要に応じて翻訳・変更履歴を更新し、コミット・プッシュする。
3. `v` を付けない `x.x.x` 形式のタグを作成してプッシュする。

```sh
git tag 0.1.0
git push origin 0.1.0
```

タグとプラグインのバージョンが一致すると、GitHub Actions がチェック・本番依存の導入・翻訳生成・ZIP 作成を行います。
ドラフト Release に ZIP を添付してから公開するため、公開直後に配布 ZIP が未添付となるのを防ぎます。
通常は追加のシークレット不要です。Actions の実行と `GITHUB_TOKEN` の contents 書き込み権限が必要です。
この初期セットアップではリモートへのプッシュ・タグ作成・Release 公開は行いません。
初回 Release 公開と、新しいバージョンを使った WordPress 上の更新テストは別途必要です。

手動で ZIP を確認する場合:

```sh
composer install --no-dev --optimize-autoloader
npm run package
# dist/od-webgl-effects.zip
composer install
```

パッケージャーは明示的に許可したファイルと本番依存のみを収録し、開発依存があれば停止します。
新しい配布ディレクトリを追加した場合は `scripts/package.py` の許可リストも更新してください。

## 参考資料

- [wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/)
- [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards)
- [WordPress 国際化](https://developer.wordpress.org/plugins/internationalization/how-to-internationalize-your-plugin/)
- [WP-CLI make-pot](https://developer.wordpress.org/cli/commands/i18n/make-pot/)
