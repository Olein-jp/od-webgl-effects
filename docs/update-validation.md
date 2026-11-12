# GitHub添付ZIPからの管理画面更新検証（Issue #1）

## 準備済みの対象

- リポジトリ: `Olein-jp/od-webgl-effects`
- 検証用タグ名: `validation-update-20261112`
- 対象コミット: `e8489a02bbc8f7b24ae4968ddf0b8aba96fc9a3e`
- ZIP内バージョン: `0.1.0`
- ZIP SHA-256: `6bfb706a9c73b766bdc7d64231fd5d735b85405bf879ffb31bbb0e12a74adeea`
- [公開済み検証用Prerelease](https://github.com/Olein-jp/od-webgl-effects/releases/tag/validation-update-20261112)

ユーザーの明示許可を受け、PrereleaseかつLatest対象外で公開済み。GitHubのLatest APIは404で、安定版Releaseは作成していない。実機未確認という元の完了条件は維持する。

## 検証の範囲

使い捨てWordPressにZIPを導入し、その環境のヘッダーだけを0.0.9へ変更して、バージョン差を作る。検証用の一時フックでGitHubの取得先を検証タグへ向け、表示バージョンをZIP内の0.1.0へ対応付ける。GitHubの応答やZIP取得をモックに置き換えない。通常の安定版/latest自動発見は、この検証の対象外。

標準管理画面の更新リンクから実行し、更新後のバージョン・有効状態・本文と属性の保持、本番依存、ZIP内全ファイルのSHA-256一致を確認する。保存結果には実際に要求したRelease添付ZIPのURLを記録する。

## 再現手順

元サイトのDBや設定を複製せず、新しいSQLite DBとループバックURLだけを使う。`--source-wp` は使い捨て環境のWordPressコアとSQLiteプラグインのコピー元。準備スクリプトはReleaseを作成・公開しない。

```sh
python3 scripts/prepare-update-validation.py \
  --source-wp /tmp/disposable-wordpress \
  --wp-cli /tmp/wp-cli.phar \
  --package /tmp/od-webgl-effects.zip \
  --sha256 6bfb706a9c73b766bdc7d64231fd5d735b85405bf879ffb31bbb0e12a74adeea \
  --release-tag validation-update-20261112
```

出力の`SCENARIO`に示されたディレクトリを確認し、そのWordPressを127.0.0.1:8901で起動する。検証用Prereleaseの公開と対象ZIPの確認後に、次を実行する。

```sh
node scripts/verify-update-ui.cjs /tmp/od-update-validation-xxxx/scenario.json
```

結果は同じ使い捨てディレクトリの`update-result.json`、画面は`update-completed.png`に保存する。再実行は新しい使い捨て環境で行う。実更新が成功するまでIssue #1の該当チェックを完了にしない。

## 実更新の結果（2026-11-12）

標準管理画面の更新リンクから、GitHub Release添付ZIPを実際に取得して更新した。

- 更新前0.0.9 → 更新後0.1.0。
- プラグインは更新後も有効。本番依存のautoloadも存在。
- 投稿の本文・保存属性は完全一致。
- 添付ZIPの79ファイルすべてで、導入後のファイルSHA-256が一致。
- 実際の取得先: `https://github.com/Olein-jp/od-webgl-effects/releases/download/validation-update-20261112/od-webgl-effects.zip`。
- 実行環境: 使い捨てWordPress 7.1.4 / PHP 8.4.8 / SQLite。
- [結果JSON](update-result-2026-11-12.json)、[管理画面の記録](update-completed-2026-11-12.png)。

この結果は検証タグを明示した実更新の確認。通常の安定版/latest自動発見や、実機・製品版ブラウザの確認を完了したものではない。Issue #1 / #8 / #10の未確認条件は引き続き残す。
