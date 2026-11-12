<?php
/** Standalone validation tests. Actual HTML API is loaded when WP_CORE_PATH is supplied. */
$filters = array();
function apply_filters( $tag, $value, ...$args ) { global $filters; return isset( $filters[ $tag ] ) ? $filters[ $tag ]( $value, ...$args ) : $value; }
function sanitize_hex_color( $v ) { return is_string( $v ) && preg_match( '/^#([a-f0-9]{3}|[a-f0-9]{6})$/iD', $v ) ? $v : null; }
function sanitize_key( $v ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $v ) ); }
function wp_json_encode( $v ) { return json_encode( $v ); }
function check( $condition, $message ) { if ( ! $condition ) { throw new RuntimeException( $message ); } echo "PASS: $message\n"; }
require __DIR__ . '/../../includes/Settings.php';
require __DIR__ . '/../../includes/BlockSupport.php';
use Olein\WebGLEffects\Settings;
use Olein\WebGLEffects\BlockSupport;
check( null === Settings::sanitize( array( 'version' => 2 ) ), 'future version rejected' );
check( null === Settings::sanitize( array( 'effect' => array() ) ), 'non-scalar effect rejected' );
check( null === Settings::sanitize( array( 'effect' => 'custom-shader' ) ), 'unknown shader rejected' );
$s = Settings::sanitize( array( 'enabled' => true, 'settings' => array( 'speed' => 900, 'intensity' => -99, 'glow' => INF, 'colors' => array( 'url(javascript:x)', '#fff' ), 'shader' => 'bad' ), 'fallback' => array( 'color' => ';color:red' ) ) );
check( 3 === $s['settings']['speed'] && 0 === $s['settings']['intensity'], 'numeric bounds enforced' );
check( 0.6 === $s['settings']['glow'] && ! isset( $s['settings']['shader'] ), 'nonfinite and unknown settings removed' );
check( '#01273e' === $s['fallback']['color'] && '#01273e' === $s['settings']['colors'][0], 'CSS injection rejected' );
check( 'var(--wp--preset--color--accent)' === Settings::color( 'var(--wp--preset--color--accent)' ), 'theme color reference retained' );
check( BlockSupport::supports( 'core/group', array( 'color' => array() ) ), 'background support defaults true when color object present' );
check( ! BlockSupport::supports( 'core/group', array( 'color' => array( 'background' => false ) ) ), 'explicit background exclusion respected' );
$filters['od_webgl_supported_blocks'] = static function () { return array( 'example/section' ); };
check( BlockSupport::supports( 'example/section', array( 'color' => true ) ) && ! BlockSupport::supports( 'core/group', array( 'color' => true ) ), 'block filter adds and removes supported blocks' );

// Identical inputs/expectations are also exercised by Jest.
$fixtures = json_decode( file_get_contents( __DIR__ . '/../fixtures/settings.json' ), true );
function canonical( $value ) {
	if ( ! is_array( $value ) ) { return $value; }
	if ( ! array_is_list( $value ) ) { ksort( $value ); }
	return array_map( 'canonical', $value );
}
foreach ( $fixtures['configs'] as $case ) {
	$actual = json_decode( json_encode( Settings::sanitize( $case['raw'] ) ), true );
	check( canonical( $case['expected'] ) === canonical( $actual ), 'shared config: ' . $case['name'] );
}
foreach ( $fixtures['controls'] as $case ) {
	$actual = json_decode( json_encode( Settings::sanitize_settings( $fixtures['definition'], $case['input'] ) ), true );
	check( canonical( $case['expected'] ) === canonical( $actual ), 'shared control: ' . $case['name'] );
}
foreach ( array( NAN, INF, -INF ) as $value ) {
	$s = Settings::sanitize( array( 'enabled' => true, 'settings' => array( 'speed' => $value ), 'performance' => array( 'maxFps' => $value ) ) );
	check( 0.4 === $s['settings']['speed'] && 30 === $s['performance']['maxFps'], 'nonfinite values use defaults' );
}
