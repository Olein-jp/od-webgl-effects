<?php
/**
 * Decorate only the root; never rewrite saved HTML.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects\Adapters;

/** RootAdapter integration. */
final class RootAdapter implements BlockAdapterInterface {
	/**
	 * Decorate the block root without modifying child content.
	 *
	 * @param string $html Rendered block HTML.
	 * @param array  $settings Validated settings.
	 * @return string
	 */
	public function decorate( $html, $settings ) {
		$tags = new \WP_HTML_Tag_Processor( $html );
		if ( ! $tags->next_tag() || ! in_array( $tags->get_tag(), array( 'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER' ), true ) ) {
			return $html;
		}
		$tags->add_class( 'has-od-webgl' );
		if ( $settings['enabled'] ) {
			$tags->set_attribute( 'data-od-webgl', wp_json_encode( $settings ) );
		}
		$tags->set_attribute( 'style', ( $tags->get_attribute( 'style' ) ?? '' ) . ';--od-webgl-fallback:' . $settings['fallback']['color'] . ';' );
		return $tags->get_updated_html();
	}
}
