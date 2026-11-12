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
		$fallback = $settings['fallback'];
		$style    = ';--od-webgl-fallback:' . $fallback['color'] . ';';
		if ( 'transparent' === $fallback['color'] ) {
			$tags->add_class( 'has-od-webgl-standard-fallback' );
		}
		$id = $fallback['imageId'] ?? 0;
		if ( $id && 'trash' !== get_post_status( $id ) && wp_attachment_is_image( $id ) && in_array( get_post_mime_type( $id ), array( 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif' ), true ) ) {
			$url = wp_get_attachment_image_url( $id, 'large' );
			$url = is_string( $url ) ? esc_url_raw( $url, array( 'http', 'https' ) ) : '';
			if ( $url && in_array( strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) ), array( 'http', 'https' ), true ) ) {
				// Percent-encode CSS string delimiters before embedding in a custom property.
				$url    = str_replace( array( '"', "'", '(', ')', '\\' ), array( '%22', '%27', '%28', '%29', '%5C' ), $url );
				$style .= '--od-webgl-image:url("' . $url . '");--od-webgl-fit:' . $fallback['fit'] . ';--od-webgl-position:' . $fallback['position'] . ';';
				$tags->add_class( 'has-od-webgl-fallback-image' );
			}
		}
		$tags->set_attribute( 'style', ( $tags->get_attribute( 'style' ) ?? '' ) . $style );
		return $tags->get_updated_html();
	}
}
