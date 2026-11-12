# 背景フォールバック（Issue #9）

画像はWordPress標準のメディア選択で指定・解除する。保存するのは `fallback.imageId`（正の整数）、fit（cover/contain、既定cover）、position（center/top/bottom/left/right、既定center）だけ。既存の色のみの属性とversion 1を維持し、URLや実行コードは属性から受け付けない。

表示順は指定画像、指定色、WordPress標準背景、背景なし。従来の色未指定データの既定色 `#01273e` は維持する。色を明示的にクリアするとtransparentを保存し、標準背景を透過する。画像の余白（contain）にも指定色が表示される。

サーバーは存在する画像attachmentからlargeサイズのURLを解決する。PNG/JPEG/GIF/WebP/AVIFを対象とし、ゴミ箱・非画像・削除済み画像は使わない。http/https以外を除外し、CSS文字列の区切りをエンコードする。CSS疑似要素として出力するためJS無効でも表示され、読み上げ・操作対象にならない。エディターは同じattachment IDをcore dataから取得する。

WebGLが正常なら装飾Canvasが手前に重なる。読み込み中・取得/シェーダー/初期化失敗・画面外・コンテキスト上限・Reduced MotionではCSSが残る。コンテキスト喪失時はCanvasを隠して画像へ戻し、復旧時に再生成する。未知バージョン・未知エフェクトでもサーバーがfallbackだけを独立検証する。画像取得不能はブラウザの背景画像失敗として色へ戻る。

Coverの元メディア・標準背景設定を変更しない。transparentかつ画像なし・Canvasなしのときは元メディアを表示する。プラグイン停止時は保存HTMLを変更していないため元の内容と標準背景が残る。Coverメディアとの同時合成やCanvas画像の自動生成は行わない。
