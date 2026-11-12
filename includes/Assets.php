<?php
/**
 * Local assets, no CDN.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects;

/** Assets integration. */
final class Assets {
	/**
	 * Enqueue a bundled script and its WordPress dependencies.
	 *
	 * @param string $name Build entry name.
	 * @return bool
	 */
	public static function script( $name ) {
		$base = dirname( __DIR__ ) . '/build/';
		if ( ! file_exists( $base . $name . '.asset.php' ) ) {
			return false;
		}
		$asset = require $base . $name . '.asset.php';
		wp_enqueue_script( 'od-webgl-' . $name, plugins_url( 'build/' . $name . '.js', OD_WEBGL_EFFECTS_FILE ), $asset['dependencies'], $asset['version'], true );
		wp_set_script_translations( 'od-webgl-' . $name, 'od-webgl-effects', dirname( __DIR__ ) . '/languages' );
		return true;
	}
	/**
	 * Enqueue background styles.
	 *
	 * @return void
	 */
	public static function style() {
		wp_enqueue_style( 'od-webgl', plugins_url( 'assets/background.css', OD_WEBGL_EFFECTS_FILE ), array(), filemtime( dirname( __DIR__ ) . '/assets/background.css' ) );
	}
	/**
	 * Enqueue assets only when an enabled block renders.
	 *
	 * @return void
	 */
	public static function frontend() {
		self::style();
		self::script( 'frontend' );
	}
	/**
	 * Enqueue editor code and authoritative server configuration.
	 *
	 * @return void
	 */
	public static function editor() {
		if ( self::script( 'editor' ) ) {
			wp_add_inline_script(
				'od-webgl-editor',
				'window.odWebglConfig = ' . wp_json_encode(
					array(
						'blocks'    => BlockSupport::editor_names(),
						'assetsUrl' => plugins_url( 'assets/', OD_WEBGL_EFFECTS_FILE ),
						'defaults'  => Settings::defaults(),
					)
				) . ';',
				'before'
			);
		}
	}
	/**
	 * Register the stylesheet before block rendering.
	 *
	 * @return void
	 */
	public static function register_style() {
		// Registered early so late block renders can print CSS before the footer.
		wp_register_style( 'od-webgl', plugins_url( 'assets/background.css', OD_WEBGL_EFFECTS_FILE ), array(), filemtime( dirname( __DIR__ ) . '/assets/background.css' ) );
	}
	/**
	 * Print conditional styles for blocks rendered after the head.
	 *
	 * @return void
	 */
	public static function late_styles() {
		if ( wp_style_is( 'od-webgl', 'enqueued' ) && ! wp_style_is( 'od-webgl', 'done' ) ) {
			wp_print_styles( 'od-webgl' );
		}
	}
}
