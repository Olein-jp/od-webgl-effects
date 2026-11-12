import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { vertex } from '../effects/shader-common';
function colorVector( value, element ) {
	const doc = element.ownerDocument;
	const probe = doc.createElement( 'span' );
	probe.style.color = value;
	probe.style.display = 'none';
	element.append( probe );
	const resolved = doc.defaultView.getComputedStyle( probe ).color;
	probe.remove();
	// Resolve CSS Color 4 and theme variables through a 2D canvas, then read sRGB.
	const context = doc
		.createElement( 'canvas' )
		.getContext( '2d', { willReadFrequently: true } );
	context.fillStyle = resolved;
	context.fillRect( 0, 0, 1, 1 );
	return [ ...context.getImageData( 0, 0, 1, 1 ).data ]
		.slice( 0, 3 )
		.map( ( v ) => v / 255 );
}
export class OGLRenderer {
	constructor( element, effect, settings ) {
		this.element = element;
		this.canvas = element.ownerDocument.createElement( 'canvas' );
		this.canvas.setAttribute( 'aria-hidden', 'true' );
		// Probe first: OGL assumes a successful context in its constructor.
		const gl = this.canvas.getContext( 'webgl', {
			alpha: true,
			depth: false,
			antialias: false,
			powerPreference: 'low-power',
			premultipliedAlpha: false,
		} );
		if ( ! gl ) throw new Error( 'WebGL unavailable' );
		this.gl = gl;
		try {
			this.renderer = new Renderer( {
				canvas: this.canvas,
				webgl: 1,
				alpha: true,
				depth: false,
				dpr: 1,
				powerPreference: 'low-power',
			} );
			this.uniforms = {};
			for ( const key of [
				'Time',
				'Speed',
				'Intensity',
				'Opacity',
				'Scale',
				'Glow',
				'Direction',
				'Distortion',
				'Mix',
				'Amplitude',
				'Frequency',
				'Count',
				'Thickness',
				'ColorCount',
			] )
				this.uniforms[ 'u' + key ] = { value: 0 };
			this.uniforms.uComplexity = { value: 1 };
			for ( const [ key, value ] of Object.entries( settings ) ) {
				if ( typeof value === 'number' )
					this.uniforms[
						'u' + key[ 0 ].toUpperCase() + key.slice( 1 )
					] = { value };
			}
			this.uniforms.uResolution = { value: [ 1, 1 ] };
			this.uniforms.uColors = {
				value: Array( 5 ).fill( [ 0, 0, 0 ] ).flat(),
			};
			this.program = new Program( gl, {
				vertex,
				fragment: effect.fragment,
				uniforms: this.uniforms,
				transparent: true,
				depthTest: false,
				depthWrite: false,
				cullFace: null,
			} );
			if (
				! gl.getProgramParameter( this.program.program, gl.LINK_STATUS )
			)
				throw new Error( 'Shader compilation failed' );
			this.geometry = new Triangle( gl );
			this.mesh = new Mesh( gl, {
				geometry: this.geometry,
				program: this.program,
				frustumCulled: false,
			} );
			this.setSettings( settings );
			element.append( this.canvas );
		} catch ( error ) {
			this.destroy();
			throw error;
		}
	}
	setSettings( settings ) {
		this.settings = settings;
		for ( const [ key, value ] of Object.entries( settings ) ) {
			const name = 'u' + key[ 0 ].toUpperCase() + key.slice( 1 );
			if ( this.uniforms[ name ] && typeof value === 'number' )
				this.uniforms[ name ].value = value;
		}
		const colors = settings.colors.map( ( c ) =>
			colorVector( c, this.element )
		);
		this.uniforms.uColorCount.value = colors.length;
		while ( colors.length < 5 ) colors.push( colors.at( -1 ) );
		this.uniforms.uColors.value = colors.flat();
	}
	setQuality( budget ) {
		this.uniforms.uComplexity.value = budget.complexity;
	}
	resize( width, height, dpr ) {
		this.renderer.dpr = dpr;
		this.renderer.setSize( width, height );
		this.uniforms.uResolution.value = [ width, height ];
	}
	update( time ) {
		if ( this.destroyed || this.paused || this.gl.isContextLost() ) return;
		this.uniforms.uTime.value = time;
		this.renderer.render( { scene: this.mesh } );
	}
	pause() {
		this.paused = true;
	}
	resume() {
		this.paused = false;
	}
	destroy() {
		if ( this.destroyed ) return;
		this.destroyed = true;
		this.geometry?.remove();
		if ( this.program ) {
			this.gl.deleteShader( this.program.vertexShader );
			this.gl.deleteShader( this.program.fragmentShader );
			this.gl.deleteProgram( this.program.program );
		}
		this.gl?.getExtension( 'WEBGL_lose_context' )?.loseContext();
		this.canvas?.remove();
	}
}
