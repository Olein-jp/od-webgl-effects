<?php
/**
 * Adapter contract.
 *
 * @package OD_WebGL_Effects
 */

namespace Olein\WebGLEffects\Adapters;

interface BlockAdapterInterface {
	/**
	 * Decorate the block root without modifying child content.
	 *
	 * @param string $html Rendered block HTML.
	 * @param array  $settings Validated settings.
	 * @return string
	 */
	public function decorate( $html, $settings );
}
