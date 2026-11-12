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
	 * Validate fallback settings; URLs are never accepted from block data.
	 *
	 * @param mixed $input Untrusted fallback data.
	 * @return array
	 */
	public static function fallback( $input ) {
		$input = is_array( $input ) ? $input : array();
		$color = $input['color'] ?? null;
		$out   = array( 'color' => '' === $color || 'transparent' === $color ? 'transparent' : self::color( $color ) );
		if ( ( is_int( $input['imageId'] ?? null ) || is_float( $input['imageId'] ?? null ) ) && floor( $input['imageId'] ) === (float) $input['imageId'] && $input['imageId'] > 0 && $input['imageId'] <= 2147483647 ) {
			$out['imageId']  = (int) $input['imageId'];
			$out['fit']      = in_array( $input['fit'] ?? '', array( 'cover', 'contain' ), true ) ? $input['fit'] : 'cover';
			$out['position'] = in_array( $input['position'] ?? '', array( 'center', 'top', 'bottom', 'left', 'right' ), true ) ? $input['position'] : 'center';
		}
		return $out;
	}
	/**
	 * Validate block-local presets without writing site or user options.
	 *
	 * @param mixed $input Untrusted preset list.
	 * @param array $defs Bundled definitions.
	 * @return array
	 */
	public static function user_presets( $input, $defs ) {
		$result = array();
		$seen   = array();
		foreach ( array_slice( is_array( $input ) && array_is_list( $input ) ? $input : array(), 0, 10 ) as $p ) {
			if ( ! is_array( $p ) || ! is_string( $p['id'] ?? null ) || ! preg_match( '/^user-[a-z0-9-]{1,35}$/D', $p['id'] ) || isset( $seen[ $p['id'] ] ) || ! is_string( $p['name'] ?? null ) || ! is_string( $p['effect'] ?? null ) || ! isset( $defs[ $p['effect'] ] ) ) {
				continue;
			}
			$name  = preg_replace( '/[\x00-\x1f\x7f]/u', '', $p['name'] );
			$name  = is_string( $name ) ? preg_replace( '/^[\p{Z}\x{FEFF}]+|[\p{Z}\x{FEFF}]+$/u', '', $name ) : null;
			$chars = is_string( $name ) ? preg_split( '//u', trim( $name ), -1, PREG_SPLIT_NO_EMPTY ) : false;
			if ( ! $chars ) {
				continue;
			}
			$seen[ $p['id'] ] = true;
			$result[]         = array(
				'id'       => $p['id'],
				'name'     => implode( '', array_slice( $chars, 0, 80 ) ),
				'effect'   => $p['effect'],
				'settings' => self::sanitize_settings( $defs[ $p['effect'] ], $p['settings'] ?? null ),
			);
		}
		return $result;
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
		$config   = array(
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
			'fallback'    => self::fallback( $f ),
		);
		if ( array_key_exists( 'userPresets', $raw ) ) {
			$config['userPresets'] = self::user_presets( $raw['userPresets'], $defs );
		}
		return $config;
	}
}
