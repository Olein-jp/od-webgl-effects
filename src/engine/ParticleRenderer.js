import { Geometry, Program, Mesh } from 'ogl';
import { OGLRenderer, colorVector } from './OGLRenderer';
import { seed, connections } from '../effects/particle-math';
import { budgets } from '../frontend/quality';
const background = `precision highp float;uniform vec3 uColors[5];uniform float uOpacity;void main(){gl_FragColor=vec4(uColors[0],uOpacity);}`;
const vertex = `attribute vec2 position;attribute vec3 color;attribute float variation;uniform float uSize,uDpr,uTime,uStars;varying vec3 vColor;varying float vAlpha;void main(){gl_Position=vec4(position*2.-1.,0,1);gl_PointSize=max(1.,uSize*uDpr*(.6+variation));vColor=color;vAlpha=mix(1.,.4+.6*(.5+.5*sin(uTime+variation*12.)),uStars);}`;
const fragment = `precision mediump float;varying vec3 vColor;varying float vAlpha;uniform float uPoint,uOpacity;void main(){float alpha=1.;if(uPoint>.5){float d=length(gl_PointCoord-.5);alpha=1.-smoothstep(.25,.5,d);}gl_FragColor=vec4(vColor,alpha*vAlpha*uOpacity);}`;
export class ParticleRenderer extends OGLRenderer {
	constructor( element, effect, settings ) {
		super( element, { ...effect, fragment: background }, settings );
		this.particleEffect = effect.fragment;
		this.budget = budgets.medium;
		this.positions = new Float32Array( 128 * 2 );
		this.linePositions = new Float32Array( 128 * 4 * 2 * 2 );
		try {
			const colors = new Float32Array( 128 * 3 ),
				variants = new Float32Array( 128 );
			for ( let i = 0; i < 128; i++ ) variants[ i ] = seed( i, 2 );
			this.pointGeometry = new Geometry( this.gl, {
				position: { size: 2, data: this.positions },
				color: { size: 3, data: colors },
				variation: { size: 1, data: variants },
			} );
			this.lineGeometry = new Geometry( this.gl, {
				position: { size: 2, data: this.linePositions },
				color: { size: 3, data: new Float32Array( 128 * 4 * 2 * 3 ) },
				variation: { size: 1, data: new Float32Array( 128 * 4 * 2 ) },
			} );
			this.pointProgram = new Program( this.gl, {
				vertex,
				fragment,
				uniforms: {
					uSize: { value: settings.size },
					uDpr: { value: 1 },
					uTime: { value: 0 },
					uStars: { value: this.particleEffect.stars ? 1 : 0 },
					uPoint: { value: 1 },
					uOpacity: { value: settings.opacity },
				},
				transparent: true,
				depthTest: false,
				depthWrite: false,
				cullFace: null,
			} );
			this.lineProgram = new Program( this.gl, {
				vertex,
				fragment,
				uniforms: {
					uSize: { value: 1 },
					uDpr: { value: 1 },
					uTime: { value: 0 },
					uStars: { value: 0 },
					uPoint: { value: 0 },
					uOpacity: { value: settings.opacity * 0.3 },
				},
				transparent: true,
				depthTest: false,
				depthWrite: false,
				cullFace: null,
			} );
			for ( const p of [ this.pointProgram, this.lineProgram ] )
				if (
					! this.gl.getProgramParameter(
						p.program,
						this.gl.LINK_STATUS
					)
				)
					throw new Error( 'Particle shader failed' );
			this.points = new Mesh( this.gl, {
				geometry: this.pointGeometry,
				program: this.pointProgram,
				mode: this.gl.POINTS,
				frustumCulled: false,
			} );
			this.lines = new Mesh( this.gl, {
				geometry: this.lineGeometry,
				program: this.lineProgram,
				mode: this.gl.LINES,
				frustumCulled: false,
			} );
			this.setSettings( settings );
		} catch ( error ) {
			this.destroy();
			throw error;
		}
	}
	setSettings( settings ) {
		super.setSettings( settings );
		if ( ! this.pointGeometry ) return;
		const palette = settings.colors.map( ( c ) =>
			colorVector( c, this.element )
		);
		for ( let i = 0; i < 128; i++ )
			this.pointGeometry.attributes.color.data.set(
				palette[ 1 + ( i % Math.max( 1, palette.length - 1 ) ) ] ||
					palette[ 0 ],
				i * 3
			);
		this.pointGeometry.attributes.color.needsUpdate = true;
		this.pointProgram.uniforms.uSize.value = settings.size;
		this.pointProgram.uniforms.uOpacity.value = settings.opacity;
		this.lineProgram.uniforms.uOpacity.value = settings.opacity * 0.3;
	}
	setQuality( budget ) {
		super.setQuality( budget );
		this.budget = budget;
	}
	resize( w, h, dpr ) {
		super.resize( w, h, dpr );
		if ( this.pointProgram ) this.pointProgram.uniforms.uDpr.value = dpr;
	}
	update( time ) {
		if ( this.destroyed || this.paused || this.gl.isContextLost() ) return;
		super.update( time );
		const count = Math.min(
			Math.floor( this.settings.density ),
			this.budget.particles
		);
		for ( let i = 0; i < count; i++ )
			this.positions.set(
				this.particleEffect.position(
					i,
					time * this.settings.speed,
					this.settings
				),
				i * 2
			);
		if ( this.settings.interactive && this.pointer?.active ) {
			for ( let i = 0; i < count; i++ ) {
				this.positions[ i * 2 ] +=
					( this.pointer.x - this.positions[ i * 2 ] ) *
					0.25 *
					this.settings.interactionStrength;
				this.positions[ i * 2 + 1 ] +=
					( this.pointer.y - this.positions[ i * 2 + 1 ] ) *
					0.25 *
					this.settings.interactionStrength;
			}
		}
		this.pointGeometry.attributes.position.needsUpdate = true;
		this.pointGeometry.setDrawRange( 0, count );
		this.pointProgram.uniforms.uTime.value = time * this.settings.speed;
		this.renderer.render( { scene: this.points, clear: false } );
		if ( this.particleEffect.trails ) {
			for ( let i = 0; i < count; i++ ) {
				this.linePositions.set(
					this.positions.subarray( i * 2, i * 2 + 2 ),
					i * 4
				);
				const past = this.particleEffect.position(
					i,
					( time - 0.8 ) * this.settings.speed,
					this.settings
				);
				// Do not draw trails across a wrapping boundary.
				const current = this.positions.subarray( i * 2, i * 2 + 2 );
				this.linePositions.set(
					Math.abs( past[ 0 ] - current[ 0 ] ) > 0.5 ||
						Math.abs( past[ 1 ] - current[ 1 ] ) > 0.5
						? current
						: past,
					i * 4 + 2
				);
				const color = this.pointGeometry.attributes.color.data.subarray(
					i * 3,
					i * 3 + 3
				);
				this.lineGeometry.attributes.color.data.set( color, i * 6 );
				this.lineGeometry.attributes.color.data.set( color, i * 6 + 3 );
			}
			this.lineGeometry.attributes.position.needsUpdate = true;
			this.lineGeometry.attributes.color.needsUpdate = true;
			this.lineGeometry.setDrawRange( 0, count * 2 );
			this.renderer.render( { scene: this.lines, clear: false } );
		}
		if ( this.particleEffect.connections ) {
			const pairs = connections(
				this.positions,
				count,
				this.settings.distance,
				this.budget.links
			);
			let n = 0;
			for ( const index of pairs ) {
				this.linePositions.set(
					this.positions.subarray( index * 2, index * 2 + 2 ),
					n * 2
				);
				this.lineGeometry.attributes.color.data.set(
					this.pointGeometry.attributes.color.data.subarray(
						index * 3,
						index * 3 + 3
					),
					n * 3
				);
				n++;
			}
			this.lineGeometry.attributes.position.needsUpdate = true;
			this.lineGeometry.attributes.color.needsUpdate = true;
			this.lineGeometry.setDrawRange( 0, n );
			if ( n )
				this.renderer.render( { scene: this.lines, clear: false } );
		}
	}
	destroy() {
		if ( this.destroyed ) return;
		this.pointGeometry?.remove();
		this.lineGeometry?.remove();
		for ( const p of [ this.pointProgram, this.lineProgram ] )
			if ( p ) {
				this.gl.deleteShader( p.vertexShader );
				this.gl.deleteShader( p.fragmentShader );
				this.gl.deleteProgram( p.program );
			}
		super.destroy();
	}
}
