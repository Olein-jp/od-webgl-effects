const config = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );
module.exports = {
	...config,
	plugins: [
		...config.plugins,
		{
			apply( compiler ) {
				compiler.hooks.thisCompilation.tap(
					'ChunkManifest',
					( compilation ) => {
						compilation.hooks.processAssets.tap(
							{
								name: 'ChunkManifest',
								stage: compiler.webpack.Compilation
									.PROCESS_ASSETS_STAGE_SUMMARIZE,
							},
							() => {
								const files = Object.keys(
									compilation.assets
								).filter( ( name ) => name.endsWith( '.js' ) );
								compilation.emitAsset(
									'chunks.json',
									new compiler.webpack.sources.RawSource(
										JSON.stringify( files, null, 2 )
									)
								);
							}
						);
					}
				);
			},
		},
	],
	entry: {
		editor: path.resolve( __dirname, 'src/editor/index.js' ),
		frontend: path.resolve( __dirname, 'src/frontend/index.js' ),
	},
	output: {
		...config.output,
		path: path.resolve( __dirname, 'build' ),
		publicPath: 'auto',
		chunkFilename: '[name].[contenthash:8].js',
	},
};
