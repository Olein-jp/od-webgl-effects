# PHP hooks and block adapters

All hooks run in normal WordPress code. Register block-support filters before core blocks initialize (e.g. at plugin load). Do not add them after `init` has registered blocks.

| Hook | Value | Extra arguments |
| --- | --- | --- |
| `od_webgl_supported_blocks` | `string[]` block names | none |
| `od_webgl_block_adapter` | `BlockAdapterInterface` | block name, parsed block |
| `od_webgl_render_settings` | raw settings array | parsed block |
| `od_webgl_default_settings` | initial settings array | none |

```php
add_filter( 'od_webgl_supported_blocks', function ( $blocks ) {
    $blocks[] = 'my-plugin/section';
    return $blocks;
} );
```

The custom block must support background color and have a single container root. Cover has an explicit core-specific exception. PHP sends the final resolved list to the editor; unsupported blocks have no panel. The default adapter supports DIV, SECTION, ARTICLE, MAIN, ASIDE, HEADER, FOOTER and changes the root only.

For a different DOM structure, implement `Olein\WebGLEffects\Adapters\BlockAdapterInterface::decorate( $html, $settings ): string` and return the instance through `od_webgl_block_adapter`. Implementations receive validated settings, including `enabled: false` for unknown effect/version fallback. Keep settings encoding/HTML escaping and CSS fallback intact. An invalid adapter is ignored safely. More advanced iframe/custom block preview adapters are deferred to Phase 3; root-container extensions work in Phase 1.

Render settings are validated after the filter. The Phase 1 server effect allowlist is `schemas/effects.json`; a render filter cannot enable arbitrary shader code or unknown effects. To remove a block, remove its name from `od_webgl_supported_blocks`.
