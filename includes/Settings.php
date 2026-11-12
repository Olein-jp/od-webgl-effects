<?php
/**
 * Settings validation shared with the editor schema.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects;

/** Settings integration. */
final class Settings {
	/**
	 * Load the bundled effect allowlist and control schemas.
	 *
	 * @return array
	 */
	public static function definitions() {
		// Local, bundled schema; never a remote URL.
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		return json_decode( file_get_contents( dirname( __DIR__ ) . '/schemas/effects.json' ), true );
	}
	/**
	 * Get filterable initial block settings.
	 *
	 * @return array
	 */
	public static function defaults() {
		/** Filters initial settings. @param array $fallbacks Default settings. */
		return apply_filters(
			'od_webgl_default_settings',
			array(
				'version'     => 1,
				'enabled'     => false,
				'effect'      => 'aurora',
				'preset'      => 'soft-blue',
				'settings'    => array(),
				'performance' => array(),
				'fallback'    => array( 'color' => '#01273e' ),
			)
		);
	}
	/**
	 * Validate a hexadecimal color or theme preset reference.
	 *
	 * @param string $value Color value.
	 * @param string $fallback Fallback value.
	 * @return string
	 */
	public static function color( $value, $fallback = '#01273e' ) {
		if ( is_string( $value ) && preg_match( '/^var\(--wp--preset--color--[a-z0-9-]+\)$/D', $value ) ) {
			return $value;
		}
		return is_string( $value ) && preg_match( '/^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/iD', $value ) ? $value : $fallback;
	}
	/**
	 * Clamp a finite numeric input.
	 *
	 * @param mixed $value Input.
	 * @param float $fallback Default.
	 * @param float $min Minimum.
	 * @param float $max Maximum.
	 * @return float
	 */
	public static function number( $value, $fallback, $min, $max ) {
		return ( is_int( $value ) || is_float( $value ) ) && is_finite( (float) $value ) ? max( $min, min( $max, (float) $value ) ) : $fallback;
	}
	/**
	 * Validate all control types using the same schema as JavaScript.
	 *
	 * @param array $def Bundled effect definition.
	 * @param mixed $input Untrusted settings.
	 * @return array
	 */
	public static function sanitize_settings( $def, $input ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$common   = json_decode( file_get_contents( dirname( __DIR__ ) . '/schemas/common.json' ), true );
		$input    = is_array( $input ) ? $input : array();
		$settings = array();
		foreach ( array_merge( $common['controls'], $def['controls'] ) as $control ) {
			$id       = $control['id'];
			$value    = $input[ $id ] ?? null;
			$fallback = $def['defaults'][ $id ] ?? null;
			switch ( $control['type'] ) {
				case 'range':
				case 'number':
					$settings[ $id ] = self::number( $value, $fallback, $control['min'] ?? -1e6, $control['max'] ?? 1e6 );
					break;
				case 'toggle':
					$settings[ $id ] = is_bool( $value ) ? $value : $fallback;
					break;
				case 'select':
					$settings[ $id ] = in_array( $value, array_column( $control['options'], 'value' ), true ) ? $value : $fallback;
					break;
				case 'color':
				case 'colorPalette':
					$settings[ $id ] = self::color( $value, $fallback );
					break;
				case 'text':
					// Count Unicode code points, matching Array.from() in JavaScript.
					$characters      = is_string( $value ) ? preg_split( '//u', $value, -1, PREG_SPLIT_NO_EMPTY ) : false;
					$settings[ $id ] = is_array( $characters ) ? implode( '', array_slice( $characters, 0, 200 ) ) : $fallback;
					break;
			}
		}
		$colors             = isset( $input['colors'] ) && is_array( $input['colors'] ) && array_is_list( $input['colors'] ) && count( $input['colors'] ) >= 2 ? array_slice( $input['colors'], 0, 5 ) : $common['colors'];
		$settings['colors'] = array_map( array( self::class, 'color' ), $colors );
		return $settings;
	}
	/**
	 * Validate settings and discard unknown parameters.
	 *
	 * @param mixed $raw Untrusted attribute data.
	 * @return array|null
	 */
	public static function sanitize( $raw ) {
		if ( ! is_array( $raw ) || 1 !== ( $raw['version'] ?? 1 ) ) {
			return null;
		}
		$effect = $raw['effect'] ?? 'aurora';
		$defs   = self::definitions();
		if ( ! is_string( $effect ) || ! isset( $defs[ $effect ] ) ) {
			return null;
		}
		$settings = self::sanitize_settings( $defs[ $effect ], $raw['settings'] ?? null );
		$p        = isset( $raw['performance'] ) && is_array( $raw['performance'] ) ? $raw['performance'] : array();
		$f        = isset( $raw['fallback'] ) && is_array( $raw['fallback'] ) ? $raw['fallback'] : array();
		return array(
			'version'     => 1,
			'enabled'     => true === ( $raw['enabled'] ?? false ),
			'effect'      => $effect,
			'preset'      => is_string( $raw['preset'] ?? null ) ? sanitize_key( $raw['preset'] ) : '',
			'settings'    => $settings,
			'performance' => array(
				'quality'       => in_array( $p['quality'] ?? '', array( 'auto', 'low', 'medium', 'high' ), true ) ? $p['quality'] : 'auto',
				'mobileQuality' => in_array( $p['mobileQuality'] ?? '', array( 'auto', 'low', 'medium', 'high' ), true ) ? $p['mobileQuality'] : 'low',
				'maxFps'        => self::number( $p['maxFps'] ?? null, 30, 1, 60 ),
				'paused'        => true === ( $p['paused'] ?? false ),
			),
			'fallback'    => array( 'color' => self::color( $f['color'] ?? null ) ),
		);
	}
}
