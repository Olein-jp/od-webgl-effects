<?php
/**
 * Public rendering.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects;

use Olein\WebGLEffects\Adapters\BlockAdapterInterface;
use Olein\WebGLEffects\Adapters\RootAdapter;
/** BlockRenderer integration. */
final class BlockRenderer {
	/**
	 * Apply validated background settings to a supported block.
	 *
	 * @param string $html Rendered HTML.
	 * @param array  $block Parsed block.
	 * @return string
	 */
	public static function render( $html, $block ) {
		$name = $block['blockName'] ?? '';
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type || ! BlockSupport::supports( $name, $type->supports ) ) {
			return $html;
		}
		$raw = $block['attrs']['odWebgl'] ?? null;
		if ( ! is_array( $raw ) || true !== ( $raw['enabled'] ?? false ) ) {
			return $html;
		}
		/**
		 * Filters settings immediately before server-side validation.
		 *
		 * @param array $settings Untrusted block settings.
		 * @param array $block Parsed block, including blockName and attrs.
		 */
		$settings = Settings::sanitize( apply_filters( 'od_webgl_render_settings', $raw, $block ) );
		if ( ! $settings ) {
			// Future versions and unknown effects retain a safe color fallback.
			$fallback = is_array( $raw['fallback'] ?? null ) ? $raw['fallback'] : array();
			$settings = array(
				'enabled'  => false,
				'fallback' => Settings::fallback( $fallback ),
			);
		}
		/**
		 * Filters the adapter used to decorate rendered block HTML.
		 *
		 * @param BlockAdapterInterface $adapter Root adapter instance.
		 * @param string                $name Block name.
		 * @param array                 $block Parsed block.
		 */
		$adapter = apply_filters( 'od_webgl_block_adapter', new RootAdapter(), $name, $block );
		if ( ! $adapter instanceof BlockAdapterInterface ) {
			return $html;
		}
		if ( $settings['enabled'] ) {
			Assets::frontend();
		} else {
			Assets::style();
		}
		return $adapter->decorate( $html, $settings );
	}
}
