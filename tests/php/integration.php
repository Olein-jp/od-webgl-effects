<?php
/** Run against an installed disposable WordPress: WP_CORE_PATH=/path/to/wordpress php tests/php/integration.php */
$core = getenv( 'WP_CORE_PATH' );
if ( ! defined( 'ABSPATH' ) && ( ! $core || ! is_file( $core . '/wp-load.php' ) ) ) { fwrite( STDERR, "WP_CORE_PATH must point to a disposable installed WordPress.\n" ); exit( 1 ); }
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
if ( ! defined( 'ABSPATH' ) ) { require $core . '/wp-load.php'; }
function od_webgl_test_check( $condition, $message ) { if ( ! $condition ) { throw new RuntimeException( $message ); } echo "PASS: $message\n"; }
use Olein\WebGLEffects\BlockSupport;
use Olein\WebGLEffects\Settings;
$names = array( 'core/group', 'core/cover', 'core/column', 'core/columns' );
foreach ( $names as $name ) {
	$type = WP_Block_Type_Registry::get_instance()->get_registered( $name );
	od_webgl_test_check( isset( $type->attributes['odWebgl'] ), "$name server attribute registered" );
	$html = '<div class="wp-block-' . substr( $name, 5 ) . '" style="padding:20px"><p>Preserved <a href="/example">link</a></p></div>';
	$block = array( 'blockName' => $name, 'attrs' => array( 'odWebgl' => array( 'version' => 1, 'enabled' => true, 'effect' => 'waves' ) ) );
	$output = Olein\WebGLEffects\BlockRenderer::render( $html, $block );
	od_webgl_test_check( false !== strpos( $output, 'data-od-webgl=' ) && false !== strpos( $output, '<p>Preserved <a href="/example">link</a></p>' ) && false !== strpos( $output, 'padding:20px' ), "$name decorates root and preserves content/styles" );
	$block['attrs']['odWebgl']['enabled'] = false;
	od_webgl_test_check( $html === Olein\WebGLEffects\BlockRenderer::render( $html, $block ), "$name disabled output unchanged" );
}
$block['attrs']['odWebgl'] = array( 'enabled' => true, 'effect' => 'unknown', 'fallback' => array( 'color' => '#123456' ) );
$output = Olein\WebGLEffects\BlockRenderer::render( $html, $block );
od_webgl_test_check( false === strpos( $output, 'data-od-webgl=' ) && false !== strpos( $output, '--od-webgl-fallback:#123456' ), 'unknown effect uses validated CSS fallback without renderer' );
$callback = static function( $settings ) { $settings['settings']['speed'] = 999; $settings['settings']['colors'] = array( 'url(bad)', '#ffffff' ); return $settings; };
add_filter( 'od_webgl_render_settings', $callback );
$block['attrs']['odWebgl'] = array( 'enabled' => true, 'effect' => 'aurora' );
$output = Olein\WebGLEffects\BlockRenderer::render( $html, $block );
$tags = new WP_HTML_Tag_Processor( $output ); $tags->next_tag();
$data = json_decode( $tags->get_attribute( 'data-od-webgl' ), true );
od_webgl_test_check( 3 === $data['settings']['speed'] && '#01273e' === $data['settings']['colors'][0], 'render hook output is revalidated' );
remove_filter( 'od_webgl_render_settings', $callback );
add_filter( 'od_webgl_supported_blocks', static function( $blocks ) { $blocks[] = 'test/section'; return $blocks; } );
register_block_type( 'test/section', array( 'supports' => array( 'color' => array( 'background' => true ) ) ) );
od_webgl_test_check( isset( WP_Block_Type_Registry::get_instance()->get_registered( 'test/section' )->attributes['odWebgl'] ), 'third-party block receives attribute via supported-block filter' );
$block['blockName'] = 'test/section';
od_webgl_test_check( false !== strpos( Olein\WebGLEffects\BlockRenderer::render( $html, $block ), 'has-od-webgl' ), 'third-party block renders with default adapter' );
$markup = '<!-- wp:group {"odWebgl":{"version":1,"enabled":true,"effect":"aurora"}} --><div class="wp-block-group"><!-- wp:paragraph --><p>Content stays</p><!-- /wp:paragraph --></div><!-- /wp:group -->';
$parsed = parse_blocks( $markup );
od_webgl_test_check( 'aurora' === $parsed[0]['attrs']['odWebgl']['effect'] && $markup === serialize_blocks( $parsed ), 'block comments preserve settings on round trip' );
$fixtures = json_decode( file_get_contents( __DIR__ . '/../fixtures/settings.json' ), true );
foreach ( $fixtures['configs'] as $case ) {
	// Exercise validation with actual WordPress sanitizers, not standalone stubs.
	$actual = json_decode( wp_json_encode( Settings::sanitize( $case['raw'] ) ), true );
	od_webgl_test_check( $actual == $case['expected'], 'WordPress schema fixture: ' . $case['name'] );
}
foreach ( Settings::definitions() as $id => $definition ) {
	foreach ( array_merge( $names, array( 'test/section' ) ) as $supported_name ) {
		$rendered = Olein\WebGLEffects\BlockRenderer::render( '<div><p>All effects retain content</p></div>', array( 'blockName' => $supported_name, 'attrs' => array( 'odWebgl' => array( 'version' => 1, 'enabled' => true, 'effect' => $id ) ) ) );
		$tag = new WP_HTML_Tag_Processor( $rendered ); $tag->next_tag();
		$config = json_decode( $tag->get_attribute( 'data-od-webgl' ), true );
		od_webgl_test_check( $id === $config['effect'] && false !== strpos( $rendered, 'All effects retain content' ), "$supported_name renders $id without changing content" );
	}

	$copy = $parsed;
	$copy[0]['attrs']['odWebgl'] = array( 'version' => 1, 'enabled' => true, 'effect' => $id, 'settings' => array( 'speed' => 1.25, 'colors' => array( 'var(--wp--preset--color--contrast)', '#abc' ) ) );
	$round_trip = parse_blocks( serialize_blocks( $copy ) );
	od_webgl_test_check( $round_trip[0]['attrs']['odWebgl'] === $copy[0]['attrs']['odWebgl'], "$id version 1 data survives serialization" );
	$output = do_blocks( serialize_blocks( $copy ) );
	$tags = new WP_HTML_Tag_Processor( $output ); $tags->next_tag();
	$data = json_decode( $tags->get_attribute( 'data-od-webgl' ), true );
	od_webgl_test_check( $id === $data['effect'] && 1.25 === $data['settings']['speed'] && 'var(--wp--preset--color--contrast)' === $data['settings']['colors'][0], "$id server allowlist matches schema and retains settings" );
}
$unknown = array( 'blockName' => 'core/group', 'attrs' => array( 'odWebgl' => array( 'enabled' => true, 'version' => 999, 'fallback' => array( 'color' => 'transparent', 'imageId' => 2147483647 ) ) ) );
$unknown_output = Olein\WebGLEffects\BlockRenderer::render( '<div class="wp-block-group" style="background-color:#fff"><p>Original</p></div>', $unknown );
od_webgl_test_check( false !== strpos( $unknown_output, 'has-od-webgl-standard-fallback' ) && false === strpos( $unknown_output, 'data-od-webgl=' ) && false !== strpos( $unknown_output, 'background-color:#fff' ), 'unknown versions and deleted images retain standard background and content' );
echo 'WordPress ' . get_bloginfo( 'version' ) . " integration complete\n";

remove_filter( 'render_block', array( Olein\WebGLEffects\BlockRenderer::class, 'render' ), 10 );
$output = do_blocks( $markup );
od_webgl_test_check( false === strpos( $output, 'data-od-webgl' ) && false !== strpos( $output, 'Content stays' ), 'without plugin rendering, original block content remains' );
