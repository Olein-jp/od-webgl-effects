# Internal effect and renderer APIs

These are internal Phase 1 source-module interfaces. External-script registration and compatibility guarantees are deferred to Phase 3.

`src/effects/registry.js` exports `EffectRegistry` and `RendererRegistry`. `src/effects/index.js` creates their instances and registers the bundled effects. Effect registration requires a unique slug, label, existing renderer, defaults, controls and `createRenderer`. Invalid/duplicate definitions throw; caller code should handle registration errors. Unregister/get/getAll are available on the effect registry.

```js
renderers.register( 'example-engine', factory );
effects.register( {
    id: 'example-effect', label: 'Example', category: 'fluid',
    renderer: 'example-engine', version: 1,
    description: 'A developer-defined effect', thumbnail: 'example.svg',
    defaults: { speed: 0.4, intensity: 0.7, opacity: 1 },
    controls: [ { id: 'scale', type: 'range', label: 'Scale', min: 0.1, max: 10, step: 0.1 } ],
    createRenderer( element, effect, settings ) { return factory( element, effect, settings ); }
} );
```

A factory initializes and returns an object with `update(time)`, `resize(width,height,dpr)`, `setSettings(settings)`, `pause()`, `resume()` and `destroy()`. Lifecycle validation happens before use. `update` receives elapsed active seconds, excluding pause time. Initial frame time is zero. Release all allocated resources and tolerate repeated destroy calls.

Control types: range, number, select, toggle, text, color, colorPalette. Controls map to standard WordPress components; settings validation drops unknown fields and bounds numeric values. Shared speed/intensity/opacity controls and a two-to-five-color palette are added by the UI. Bundled effect schemas are imported from `schemas/effects.json` by JavaScript and read by PHP. A new bundled effect must be added to this schema, its renderer registration and shader implementation, plus tests/translations. This keeps the server allowlist authoritative.

Palettes accept 3/6-digit hexadecimal values and `var(--wp--preset--color--slug)`. No user-provided GLSL or executable code is accepted through attributes. Presets currently provide Soft Blue, Warm and Forest palettes; manual settings remain editable.

## Phase 2の内部実装

UIメタデータはOGL・シェーダーをimportしない。`loadRenderer()`がキャッシュ済みモジュールの準備を待ち、その後に同期的な`createRenderer()`を呼ぶ。読み込み中の設定変更は最新値を使用する。破棄・切替・可視条件の変化でトークンを無効化し、GPU確保の前後で古い処理を除外する。失敗時はCSSフォールバックを残し、別エフェクトへの切替で回復できる。

WebpackはエントリースクリプトのURLからpublicPathを自動決定する。全チャンクはローカルのハッシュ付きファイルとして`build/chunks.json`へ記録する。配布スクリプトは不足チャンクを拒否し、build全体を同梱する。共有OGLは1つのvendorチャンクでキャッシュする。シェーダー・粒子系は個別モジュールを持ち、粒子エンジンも必要時だけ取得する。

#3時点の初期バンドルはfrontend 13.3 KiB（従来56.1）、editor 20.4 KiB（従来63.4）。Phase 2全機能追加後はfrontend約30 KiB、editor約41 KiB。未圧縮サイズで、スキーマとUIは初期バンドルに含む。未使用ページはアセットなし、1種類の表示はエントリー・共有OGL・エンジン・対象モジュール、複数種類は追加モジュールだけを取得する。

品質予算は`setQuality(budget)`、入力は`setPointer(input,time)`で任意対応する。全エフェクトは共通Managerの単一RAF・可視制御・停止・復旧・破棄を使う。粒子系は固定シード・解析時刻の位置計算で再現性を持ち、固定サイズのバッファと線形上限の近接候補探索を使用する。外部向けの互換性保証は引き続きPhase 3で扱う。
