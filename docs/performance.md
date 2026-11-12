# 品質と描画予算（Issue #8）

| 品質 | 最大DPR | 最大FPS | 最大ピクセル面積 | 複雑度 | 粒子 / 接続候補採用数 |
| --- | --- | --- | --- | --- | --- |
| Low | 0.75 | 20 | 100万 | 0.35 | 32 / 2 |
| Medium | 1 | 30 | 200万 | 0.65 | 64 / 3 |
| High | 2 | 60 | 400万 | 1 | 128 / 4 |

最大辺は4096px。FPSはユーザー指定との小さい方。モバイル（幅768px未満）はmobileQualityが優先し、Autoも独立した選択。静止指定と非選択エディタープレビューは初回1フレームだけ。Reduced Motionは描画しない。

AutoはMediumから開始し、アクティブなRAFの間隔と直前のCPU描画発行時間だけを参照する。30フレーム連続で25ms超の間隔または20ms超の発行時間なら1段階下げる。300フレーム連続で19ms未満かつ発行8ms未満なら1段階上げる。変更後5秒のクールダウン。250ms超の中断、静止、非表示、画面外は観測から除外し、再開時に履歴をリセットする。GPU計測値ではなく端末全体の応答性の指標であり、低性能GPUの保証ではない。

実可視領域（先読みマージンなし）を対象とし、ライブ編集対象、可視比率の順で最大4背景に配分。上限外・失敗時はCSSフォールバックを維持。単一RAFを共有し、エフェクトは独立したループを作らない。

`performance.spec.js`で1・3・10背景 × desktop1440 / mobile390 / 長いブロック10000pxを測定する。各条件60フレームのRAF中央値・p95、稼働Canvas数と解像度をJSONに保存する。フレーム間隔はGPU処理時間ではない。ローカル測定を初期予算の回帰基準とし、低性能端末実測での最終調整はIssue #1 / #8のリリース条件として残す。

## 継続描画と実描画の再確認（2026-11-12）

リサイズ・Auto品質変更時に `resize()` から1フレーム描画すると、アクティブなレンダラーまでpauseされる不具合を修正した。動作中はresume状態を維持し、静止指定時だけpauseする。修正前ビルドでリサイズ後の描画停止を再現し、修正後はChromium / Firefox / WebKitで描画継続を確認した。疑似RAF時計によるAuto引き下げ後にも実際のdraw呼出が継続することを確認する。250ms超の間隔では高速・低速の連続観測もリセットする。

`load-profile.spec.js` はWebGLのdraw呼出を計測し、RAF回数と実描画FPSを分ける。Aurora / Particle Connectionsについて背景1・3・10個 × desktop / mobile / tallの各9条件を測定し、描画間隔中央値・p95、FPS、CPU側描画命令発行時間、Canvas解像度、レンダラー名を保存する。GPU処理時間を計測したものではない。

`performance-draw-default-2026-11-12.json` と `performance-draw-software-2026-11-12.json` に結果を記録。既定経路も明示的なソフトウェア描画経路も、取得できたレンダラー名はSwiftShaderだった。いずれも物理GPU実機の結果として扱わない。停止しないこと、最大4コンテキスト、最大辺4096px、面積予算、FPS上限を検証した。

```sh
WP_BASE_URL=http://localhost:8899 WP_PASSWORD=... npm run test:e2e -- --project=chromium load-profile.spec.js
OD_SOFTWARE_GPU=1 WP_BASE_URL=http://localhost:8899 WP_PASSWORD=... npm run test:e2e -- --config=playwright.software.config.js load-profile.spec.js
```

実機なしでは確認できないiOS / Android・低性能GPUについて、ユーザーの指定により元の完了条件を維持する。Issue #1 / #8 / #10は未完了のまま残し、ソフトウェア描画や疑似時計の成功で実機条件を代替しない。
