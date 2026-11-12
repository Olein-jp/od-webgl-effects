<?php
/**
 * Register hooks before core block registration.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects;

/** Plugin integration. */
final class Plugin {
	/**
	 * Register integration hooks before core blocks initialize.
	 *
	 * @return void
	 */
	public static function boot() {
		add_filter( 'register_block_type_args', array( BlockSupport::class, 'attributes' ), 10, 2 );
		add_filter( 'render_block', array( BlockRenderer::class, 'render' ), 10, 2 );
		add_action( 'enqueue_block_editor_assets', array( Assets::class, 'editor' ) );
		add_action(
			'enqueue_block_assets',
			static function () {
				if ( is_admin() ) {
					Assets::style();
				} }
		);
		add_action( 'wp_enqueue_scripts', array( Assets::class, 'register_style' ) );
		add_action( 'wp_footer', array( Assets::class, 'late_styles' ), 5 );
	}
}
