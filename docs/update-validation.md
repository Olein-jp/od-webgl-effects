# GitHub添付ZIPからの管理画面更新検証（Issue #1）

## 準備済みの対象

- リポジトリ: `Olein-jp/od-webgl-effects`
- 検証用タグ名: `validation-update-20261112`
- 対象コミット: `e8489a02bbc8f7b24ae4968ddf0b8aba96fc9a3e`
- ZIP内バージョン: `0.1.0`
- ZIP SHA-256: `6bfb706a9c73b766bdc7d64231fd5d735b85405bf879ffb31bbb0e12a74adeea`
- [未公開ドラフト](https://github.com/Olein-jp/od-webgl-effects/releases/tag/untagged-3b5be5bd9d30cea1c511)

公開操作はユーザー確認待ち。公開する場合もPrereleaseかつLatest対象外とし、一般利用者向けの安定版にはしない。実機未確認という元の完了条件は維持する。

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

## 現在の検証結果

準備スクリプトで、独立したlocal環境・ループバックURL・0.0.9で有効なプラグイン・保存確認用の投稿を作成できた。補助PHP/JS/Pythonの構文を確認済み。GitHub添付ZIPからの実更新は未実施であり、成功扱いにしない。
