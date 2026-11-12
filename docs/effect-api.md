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

## Phase 2: lazy renderer loading (#3)

UI metadata never imports OGL or a shader implementation. `loadRenderer()` resolves the shared cached module before the synchronous `createRenderer()` factory is called. Each entry has an invalidation token, checked before GPU allocation and after async completion. Removal, switching, reduced motion and loss of eligibility invalidate pending work. Settings changed during loading use the latest validated settings. Load failure keeps the CSS fallback and content; changing to another effect permits recovery.

Webpack derives the public path from the entry script URL, including subdirectory installs and editor iframes. All JS chunks are local, content hashed and listed in `build/chunks.json`; the package builder rejects missing manifest files/chunks and includes the complete build directory. OGL is in one shared vendor chunk, cached by the webpack runtime.

Initial production bundles: frontend 13.3 KiB (previously 56.1), editor 20.4 KiB (previously 63.4); shared OGL 43.1 KiB, engine 3.22 KiB, effect shaders 1.06–1.26 KiB (uncompressed). Unused page: no plugin JS. One visible effect: entry + shared OGL + engine + its shader. Multiple kinds: only additional shader chunks; repeated instances reuse modules. Network tests cover unused pages, one kind, failed chunks and removal while pending.
