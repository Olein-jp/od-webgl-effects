# ポインター入力（Issue #7）

Ripple、Mesh Gradient、Floating ParticlesだけがPointer interactionと強度0〜1を提供する。既定は無効。Rippleは入力位置を波紋の原点にし、押下時に位相を再開。Meshは色配置を追従させ、Floating Particlesは位置を緩く引き寄せる。共通の速度・強度・不透明度と独立して調整できる。

親ブロックのpointermove/down/up/leave/cancelをpassiveで取得する。preventDefault、ポインターキャプチャ、グローバルなマウスイベントは使わない。Canvasはpointer-events:none、aria-hiddenの装飾。キーボード・リンク・ボタン・テキスト選択・スクロールを通常どおり扱える。touchイベントは反応させず、タッチスクロールを優先する。マウスやペンを使うハイブリッド端末は個々のpointerTypeで判定する。

座標はイベントごとの最新bounding rectから0〜1へ制限し、Yを描画座標に反転。退出・キャンセルでactive/downを解除。イベント処理は座標・移動量・状態を保存するだけで、GPU更新は単一RAFの既存描画時に行う。

無効・静止・エディター非選択・画面外・非表示・Reduced Motion・破棄では全リスナーを解除する。静止プレビューでは入力による追加描画をしない。再開時は新しい入力状態から開始する。
