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
	 * Load the bundled effect allowlist and numeric bounds.
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
		return is_string( $value ) && sanitize_hex_color( $value ) ? $value : $fallback;
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
		return is_numeric( $value ) && is_finite( (float) $value ) ? max( $min, min( $max, (float) $value ) ) : $fallback;
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
		$def      = $defs[ $effect ];
		$input    = isset( $raw['settings'] ) && is_array( $raw['settings'] ) ? $raw['settings'] : array();
		$settings = $def['defaults'];
		$controls = array_merge(
			array(
				array(
					'id'  => 'speed',
					'min' => 0,
					'max' => 3,
				),
				array(
					'id'  => 'intensity',
					'min' => 0,
					'max' => 2,
				),
				array(
					'id'  => 'opacity',
					'min' => 0,
					'max' => 1,
				),
			),
			$def['controls']
		);
		foreach ( $controls as $control ) {
			$id              = $control['id'];
			$settings[ $id ] = self::number( $input[ $id ] ?? null, $settings[ $id ], $control['min'], $control['max'] );
		}
		$colors             = isset( $input['colors'] ) && is_array( $input['colors'] ) ? array_slice( $input['colors'], 0, 5 ) : array( '#01273e', '#074073', '#faa500' );
		$settings['colors'] = array_map( array( self::class, 'color' ), $colors );
		if ( count( $settings['colors'] ) < 2 ) {
			$settings['colors'] = array( '#01273e', '#074073' );
		}
		$p = isset( $raw['performance'] ) && is_array( $raw['performance'] ) ? $raw['performance'] : array();
		$f = isset( $raw['fallback'] ) && is_array( $raw['fallback'] ) ? $raw['fallback'] : array();
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
