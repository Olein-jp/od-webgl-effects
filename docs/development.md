# Development and testing

Requirements: PHP 8.1+, Composer 2, Node 22+, npm 10+, Python 3, Docker Desktop for wp-env.

```sh
npm ci --ignore-scripts
composer install
npm run build
npm run env:start
```

Open http://localhost:8888/wp-admin/ (wp-env defaults: admin / password). `npm start` watches JavaScript. Assets in `build/` are committed and included in the installable ZIP. OGL is pinned to 1.0.11; build tools and Playwright are development dependencies.

```sh
npm run test:unit
npm run test:php
composer validate --strict
composer lint
npm run env:cli -- eval-file wp-content/plugins/od-webgl-effects/tests/php/integration.php
npx playwright install
npm run test:e2e -- backgrounds
```

For an installed disposable WordPress outside Docker:

```sh
WP_CORE_PATH=/absolute/path/to/wordpress npm run test:integration
WP_BASE_URL=http://localhost:8899 WP_USER=admin WP_PASSWORD=your-local-password npm run test:e2e -- backgrounds
```

Integration tests register a temporary test block/filter in the current PHP process, without persisting site settings. E2E tests create/publish/delete fixture posts, so use a disposable local site. A failed test may leave its fixture post for inspection.

## Visual comparisons

`tests/e2e/visual.spec.js` uses static effects at time zero and captures editor, each public effect, three widths (1440/768/390), plus fallback. The checked-in Chromium/macOS baselines use WordPress 7.1.4 and its default Twenty Twenty-Five theme. Use that environment for comparisons:

```sh
npm run test:e2e -- --project=chromium visual
# Only after reviewing a deliberate visual change:
npm run test:e2e -- --project=chromium visual --update-snapshots
```

Firefox and WebKit run functional tests but skip Chromium-specific image comparisons. Different OS/font/GPU/theme/WordPress versions require their own reviewed baselines. CI runs functional Chromium tests on WordPress 6.9 and latest, plus JS/PHP tests and WPCS; it does not compare macOS images on Linux.

## Translations

English source strings use `@wordpress/i18n`. Japanese PO/MO and the editor translation JSON are bundled. `i18n-map.json` maps both editor source files to `build/editor.js`, so `wp_set_script_translations()` can find the correct bundle hash.

```sh
npm run i18n:pot
# Update the Japanese PO from the POT (wp i18n update-po), then translate.
npm run i18n:mo
npm run i18n:json
```

With a local WP-CLI, the equivalent `wp i18n` commands do not require Docker. Keep `--no-purge --use-map=i18n-map.json` when generating JSON.

## Distribution

Update matching plugin/package/readme versions before tagging. The release workflow builds JavaScript, validates code, generates translations and assembles production dependencies. Only after both build and WordPress integration jobs pass does an `x.x.x` tag publish a Release with `od-webgl-effects.zip`. No tag/push/release is performed by local build commands.

```sh
composer install --no-dev --optimize-autoloader
npm run build
npm run package
composer install
```

The package script refuses missing bundles, missing updater dependencies, dev Composer dependencies or mismatched versions. Source code ZIPs are not installation packages. Build assets, schema, styles, translations, OGL license notice and updater production dependencies are included.
