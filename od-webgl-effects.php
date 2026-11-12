<?php
/**
 * Plugin Name: OD WebGL Effects
 * Plugin URI: https://github.com/Olein-jp/od-webgl-effects
 * Description: WebGL background effects for WordPress blocks.
 * Version: 0.1.0
 * Requires at least: 6.9
 * Requires PHP: 8.1
 * Author: Koji Kuno
 * Author URI: https://olein-design.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: od-webgl-effects
 * Domain Path: /languages
 * Update URI: https://github.com/Olein-jp/od-webgl-effects
 *
 * @package OD_WebGL_Effects
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Load translations and configure GitHub updates.
 *
 * @return void
 */
function od_webgl_effects_bootstrap() {
	load_plugin_textdomain( 'od-webgl-effects', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

	$autoload = __DIR__ . '/vendor/autoload.php';
	if ( ! file_exists( $autoload ) ) {
		add_action( 'admin_notices', 'od_webgl_effects_missing_dependencies_notice' );
		return;
	}

	require_once $autoload;

	add_filter(
		'inc2734_github_plugin_updater_zip_url_Olein-jp/od-webgl-effects',
		'od_webgl_effects_release_zip_url',
		10,
		4
	);

	new \Inc2734\WP_GitHub_Plugin_Updater\Bootstrap(
		plugin_basename( __FILE__ ),
		'Olein-jp',
		'od-webgl-effects'
	);
}
add_action( 'init', 'od_webgl_effects_bootstrap' );

/**
 * Download the release asset, including production Composer dependencies.
 *
 * @param string $url        Default package URL.
 * @param string $user_name  Repository owner.
 * @param string $repository Repository name.
 * @param string $tag_name   Release tag.
 * @return string
 */
function od_webgl_effects_release_zip_url( $url, $user_name, $repository, $tag_name ) {
	if ( ! preg_match( '/^[0-9]+\.[0-9]+\.[0-9]+$/D', $tag_name ) ) {
		return $url;
	}

	return sprintf(
		'https://github.com/%s/%s/releases/download/%s/od-webgl-effects.zip',
		rawurlencode( $user_name ),
		rawurlencode( $repository ),
		rawurlencode( $tag_name )
	);
}

/**
 * Explain how to install missing development dependencies.
 *
 * @return void
 */
function od_webgl_effects_missing_dependencies_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	printf(
		'<div class="notice notice-error"><p>%s</p></div>',
		esc_html__( 'OD WebGL Effects: dependencies are missing. Run composer install or install the ZIP asset from GitHub Releases.', 'od-webgl-effects' )
	);
}

// Load feature hooks before WordPress registers core blocks on init.
define( 'OD_WEBGL_EFFECTS_FILE', __FILE__ );
foreach ( array( 'Settings', 'BlockSupport', 'Adapters/BlockAdapterInterface', 'Adapters/RootAdapter', 'Assets', 'BlockRenderer', 'Plugin' ) as $od_webgl_effects_class ) {
	require_once __DIR__ . '/includes/' . $od_webgl_effects_class . '.php';
}
\Olein\WebGLEffects\Plugin::boot();
