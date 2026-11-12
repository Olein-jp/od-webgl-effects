const config = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );
module.exports = {
	...config,
	entry: {
		editor: path.resolve( __dirname, 'src/editor/index.js' ),
		frontend: path.resolve( __dirname, 'src/frontend/index.js' ),
	},
	output: { ...config.output, path: path.resolve( __dirname, 'build' ) },
};
