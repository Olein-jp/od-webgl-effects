const modules = {
	'floating-particles': () =>
		import(
			/* webpackChunkName: "effect-floating-particles" */ './modules/floating-particles'
		),
	'particle-connections': () =>
		import(
			/* webpackChunkName: "effect-particle-connections" */ './modules/particle-connections'
		),
	'flow-field': () =>
		import(
			/* webpackChunkName: "effect-flow-field" */ './modules/flow-field'
		),
	stars: () =>
		import( /* webpackChunkName: "effect-stars" */ './modules/stars' ),

	'mesh-gradient': () =>
		import(
			/* webpackChunkName: "effect-mesh-gradient" */ './modules/mesh-gradient'
		),
	ripple: () =>
		import( /* webpackChunkName: "effect-ripple" */ './modules/ripple' ),
	'noise-field': () =>
		import(
			/* webpackChunkName: "effect-noise-field" */ './modules/noise-field'
		),
	'animated-grid': () =>
		import(
			/* webpackChunkName: "effect-animated-grid" */ './modules/animated-grid'
		),

	aurora: () =>
		import( /* webpackChunkName: "effect-aurora" */ './modules/aurora' ),
	'fluid-gradient': () =>
		import(
			/* webpackChunkName: "effect-fluid-gradient" */ './modules/fluid-gradient'
		),
	waves: () =>
		import( /* webpackChunkName: "effect-waves" */ './modules/waves' ),
};
const cache = new Map();
export function loadEffect( id ) {
	if ( ! modules[ id ] )
		return Promise.reject( new Error( 'Unknown effect' ) );
	if ( ! cache.has( id ) ) {
		cache.set(
			id,
			modules[ id ]()
				.then( async ( shader ) => {
					const engine = shader.default.position
						? await import(
								/* webpackChunkName: "engine-particles" */ '../engine/ParticleRenderer'
							)
						: await import(
								/* webpackChunkName: "engine-ogl" */ '../engine/OGLRenderer'
							);
					return {
						OGLRenderer:
							engine.ParticleRenderer || engine.OGLRenderer,
						fragment: shader.default,
					};
				} )
				.catch( ( error ) => {
					cache.delete( id );
					throw error;
				} )
		);
	}
	return cache.get( id );
}
