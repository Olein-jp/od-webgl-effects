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
