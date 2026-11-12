# Architecture

## Scope

Phase 1 targets WordPress 6.9+ and PHP 8.1+. OGL 1.0.11 is bundled locally (Unlicense; see THIRD_PARTY_LICENSES.txt). No CDN, custom content block, arbitrary shader input, or additional REST endpoint is used.

- `includes/BlockSupport.php`: server allowlist and `odWebgl` object attribute. Cover is an explicit exception to background-color support because core sets `color.background` to false and manages its own media/overlay.
- `includes/Settings.php` + `schemas/effects.json`: server effect allowlist, common numeric validation, color validation, version checks. Render-hook output is validated again.
- `includes/Adapters/RootAdapter.php`: WordPress HTML API decorates the root only. Server markup has a data attribute and CSS fallback; JavaScript creates a decorative mount and canvas at runtime. Existing block `save()` output is untouched.
- `src/editor`: WordPress InspectorControls in the styles sidebar; block-list wrapper filter maintains preview classes through React updates. A marker locates the correct owner document, including the editor iframe.
- `src/effects`: schemas, palettes, presets, GLSL, registration checks. Effect-specific controls are generated from schemas.
- `src/engine/OGLRenderer.js`: OGL geometry, uniform updates, drawing and GPU cleanup.
- `src/frontend/manager.js`: per-document manager shared by editor and public runtime. At most four contexts per document; nearby visible blocks initialize lazily. Other blocks display the CSS fallback. Nonselected editor blocks draw a static frame; only selected blocks in live mode animate.

`destroy()` removes listeners, RAF, observers, buffers, VAOs, programs, shaders and the canvas. Visibility changes and Reduced Motion release contexts. Returning to a visible state recreates them. Context loss is handled without modifying content. Shader/link/context errors leave a validated fallback.

A single frame loop enforces per-block FPS (default 30, maximum 60). DPR is bounded by quality, mobile quality, maximum dimension 4096 and backing-store area of 4 million pixels. Static previews use time zero initially; shaders use no randomness, making screenshot fixtures deterministic.

## Layering and Cover

A local stacking context places the decorative layer behind content and above the block's own background. Decoration ignores pointer events and inherits the root border radius. Core flow margins and constrained child widths are explicitly neutralized on the mount. Sticky core groups preserve `position: sticky`.

When enabled on Cover, direct background media and overlays are hidden with CSS. Media attributes remain in the saved block and reappear when WebGL is disabled. Configured WebGL opacity reveals its fallback/standard background; media compositing is outside Phase 1. Choose readable text colors using the normal block settings.

## Assets and compatibility

`@wordpress/scripts` builds classic script entries with generated `.asset.php` dependencies. The editor uses WordPress's React, packages and translation runtime. Script Modules were considered; Phase 1 uses classic entries to keep the package-extraction/translation path identical between editor and public code. All three small shaders currently ship together; per-effect code splitting is deferred.

Frontend JS/CSS are enqueued only when an enabled supported block renders. Unknown effect/version values render a CSS fallback without a WebGL script request. Footer style printing handles blocks rendered after `wp_head`. Editor canvas styles use `enqueue_block_assets` for iframe compatibility.

Theme palette selections store `var(--wp--preset--color--slug)`. On initialization/settings changes, the renderer resolves computed CSS colors to sRGB. Theme color updates are reflected on the next render/page load; live theme palette editing during an active animation is not continuously observed.

## Primary references

- https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/
- https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/
- https://developer.wordpress.org/reference/classes/wp_html_tag_processor/
- https://developer.wordpress.org/reference/functions/wp_enqueue_script_module/
- https://developer.wordpress.org/reference/functions/wp_set_script_translations/
- https://developer.wordpress.org/cli/commands/i18n/make-json/
- https://github.com/oframe/ogl
- https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
