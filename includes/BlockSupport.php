<?php
/**
 * Supported blocks and attributes.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects;

/** BlockSupport integration. */
final class BlockSupport {
	/**
	 * Get the supported block allowlist.
	 *
	 * @return string[]
	 */
	public static function names() {
		/**
		 * Filters block names eligible for background support and root decoration.
		 *
		 * @param string[] $blocks Supported block names.
		 */
		$names = apply_filters( 'od_webgl_supported_blocks', array( 'core/group', 'core/cover', 'core/column', 'core/columns' ) );
		return is_array( $names ) ? array_values( array_filter( $names, 'is_string' ) ) : array();
	}
	/**
	 * Check background support and the explicit allowlist.
	 *
	 * @param string $name Block name.
	 * @param array  $supports Block supports.
	 * @return bool
	 */
	public static function supports( $name, $supports ) {
		$color = $supports['color'] ?? false;
		// Cover uses its own media/overlay background, rather than color.background.
		return in_array( $name, self::names(), true ) && ( 'core/cover' === $name || true === $color || ( is_array( $color ) && false !== ( $color['background'] ?? true ) ) );
	}
	/**
	 * Extend registered block attributes without changing save output.
	 *
	 * @param array  $args Block arguments.
	 * @param string $name Block name.
	 * @return array
	 */
	public static function attributes( $args, $name ) {
		if ( self::supports( $name, $args['supports'] ?? array() ) ) {
			$args['attributes']['odWebgl'] = array( 'type' => 'object' );
		}
		return $args;
	}
	/**
	 * Resolve supported blocks using the server registry.
	 *
	 * @return string[]
	 */
	public static function editor_names() {
		$names = array();
		foreach ( \WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			if ( self::supports( $name, $type->supports ) ) {
				$names[] = $name;
			}
		}
		return $names;
	}
}
