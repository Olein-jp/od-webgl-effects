<?php
/** 検証用Prereleaseのメタデータだけを選択する、一時環境専用のフック。 */
if ( 'local' !== wp_get_environment_type() ) {
	return;
}
add_filter(
	'inc2734_github_plugin_updater_request_url_Olein-jp/od-webgl-effects',
	static function () {
		return 'https://api.github.com/repos/Olein-jp/od-webgl-effects/releases/tags/__RELEASE_TAG__';
	}
);
add_filter(
	'inc2734_github_plugin_updater_transient_response_Olein-jp/od-webgl-effects',
	static function ( $update ) {
		// 検証タグ名をZIP内のバージョンへ対応付ける。通常の最新版検出には使わない。
		$update->new_version = '__TARGET_VERSION__';
		return $update;
	}
);
add_filter(
	'upgrader_pre_download',
	static function ( $reply, $package, $upgrader, $extra ) {
		if ( 'od-webgl-effects/od-webgl-effects.php' === ( $extra['plugin'] ?? '' ) ) {
			update_option( 'od_update_validation_download', $package );
		}
		return $reply;
	},
	1,
	4
);
