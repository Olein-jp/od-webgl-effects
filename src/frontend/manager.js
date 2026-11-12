import { effects } from '../effects';
import { normalize } from '../effects/settings';
import { checkLifecycle } from '../effects/registry';
// Managers are scoped to the document (including editor iframes).
const managers = new WeakMap();
export function getManager( doc ) {
	if ( ! managers.has( doc ) ) managers.set( doc, new Manager( doc ) );
	return managers.get( doc );
}
export class Manager {
	constructor( doc, limit = 4 ) {
		this.doc = doc;
		this.win = doc.defaultView;
		this.limit = limit;
		this.entries = new Map();
		this.motion = this.win.matchMedia( '(prefers-reduced-motion: reduce)' );
		this.onState = () => this.sync();
		this.motion.addEventListener( 'change', this.onState );
		doc.addEventListener( 'visibilitychange', this.onState );
		this.intersection = new this.win.IntersectionObserver(
			( items ) => {
				for ( const item of items ) {
					const e = this.entries.get( item.target );
					if ( e ) e.visible = item.isIntersecting;
				}
				this.sync();
			},
			{ rootMargin: '100px' }
		);
		this.resizeObserver = new this.win.ResizeObserver( ( items ) => {
			for ( const item of items )
				this.resize( this.entries.get( item.target ) );
		} );
		this.onResize = () => {
			for ( const e of this.entries.values() ) this.resize( e );
		};
		this.win.addEventListener( 'resize', this.onResize );
		this.tick = this.tick.bind( this );
	}
	mount( root, raw, { live = true } = {} ) {
		const config = normalize( raw, effects );
		if ( ! config ) return () => {};
		this.remove( root );
		const layer = this.doc.createElement( 'div' );
		layer.className = 'od-webgl-background';
		layer.setAttribute( 'aria-hidden', 'true' );
		root.append( layer );
		const e = {
			root,
			layer,
			config,
			live,
			visible: false,
			time: 0,
			last: null,
		};
		this.entries.set( root, e );
		this.intersection.observe( root );
		this.resizeObserver.observe( root );
		return () => this.remove( root );
	}
	update( root, raw, live = true ) {
		const e = this.entries.get( root );
		const config = normalize( raw, effects );
		if ( ! e || ! config ) {
			this.remove( root );
			if ( config ) this.mount( root, raw, { live } );
			return;
		}
		if ( e.config.effect !== config.effect ) {
			this.release( e );
			e.failed = false;
		}
		e.config = config;
		e.live = live;
		try {
			e.renderer?.setSettings( config.settings );
			this.resize( e );
			this.still( e );
		} catch {
			this.release( e );
			e.failed = true;
		}
		this.sync();
	}
	resize( e ) {
		if ( ! e?.renderer ) return;
		const rect = e.root.getBoundingClientRect();
		let q = e.config.performance.quality;
		if ( this.win.innerWidth < 768 ) q = e.config.performance.mobileQuality;
		const caps = { low: 0.75, medium: 1, high: 2, auto: 1.5 };
		const dpr = Math.min( this.win.devicePixelRatio || 1, caps[ q ] );
		// Bound backing-store area on very tall blocks.
		const bound = Math.min(
			dpr,
			4096 / Math.max( rect.width, rect.height, 1 ),
			Math.sqrt( 4000000 / Math.max( rect.width * rect.height, 1 ) )
		);
		e.renderer.resize(
			Math.max( 1, rect.width ),
			Math.max( 1, rect.height ),
			bound
		);
		this.still( e );
	}
	still( e ) {
		if ( ! e.renderer || e.lost ) return;
		e.renderer.resume();
		e.renderer.update( this.fixedTime ?? e.time );
		e.renderer.pause();
	}
	release( e ) {
		e.generation = ( e.generation || 0 ) + 1;
		e.loading = false;
		if ( e.canvas ) {
			e.canvas.removeEventListener( 'webglcontextlost', e.onLost );
			e.canvas.removeEventListener(
				'webglcontextrestored',
				e.onRestored
			);
		}
		e.renderer?.destroy();
		e.renderer = null;
		e.canvas = null;
		e.active = false;
		e.last = null;
	}
	initialize( e ) {
		e.loading = true;
		const generation = e.generation || 0;
		const effect = effects.get( e.config.effect );
		// The token is checked before creating a GPU context, not just after loading.
		Promise.resolve()
			.then( () =>
				effect.loadRenderer ? effect.loadRenderer() : null
			)
			.then( () => {
				if (
					this.entries.get( e.root ) !== e ||
					( e.generation || 0 ) !== generation ||
					! e.loading
				)
					return;
				return effect.createRenderer(
					e.layer,
					effect,
					e.config.settings
				);
			} )
			.then( ( renderer ) => {
				if ( ! renderer ) return;
				if (
					this.entries.get( e.root ) !== e ||
					( e.generation || 0 ) !== generation ||
					! e.loading
				) {
					renderer.destroy();
					return;
				}
				e.renderer = renderer;
				checkLifecycle( renderer );
				e.loading = false;
				e.canvas = e.layer.querySelector( 'canvas' );
				e.onLost = ( event ) => {
					event.preventDefault();
					e.lost = true;
					e.active = false;
					e.renderer?.pause();
				};
				e.onRestored = () => {
					this.release( e );
					e.lost = false;
					this.sync();
				};
				e.canvas?.addEventListener( 'webglcontextlost', e.onLost );
				e.canvas?.addEventListener(
					'webglcontextrestored',
					e.onRestored
				);
				this.resize( e );
				this.sync();
			} )
			.catch( () => {
				if (
					this.entries.get( e.root ) !== e ||
					( e.generation || 0 ) !== generation
				)
					return;
				this.release( e );
				e.failed = true;
				this.sync();
			} );
	}
	sync() {
		let used = 0;
		for ( const e of [ ...this.entries.values() ].sort(
			( a, b ) => Number( b.live ) - Number( a.live )
		) ) {
			const eligible =
				e.visible &&
				! this.doc.hidden &&
				! this.motion.matches &&
				! e.failed;
			if ( ! eligible || used >= this.limit ) {
				this.release( e );
				continue;
			}
			used++;
			if ( ! e.renderer ) {
				if ( ! e.loading ) this.initialize( e );
				continue;
			}
			e.active =
				e.live &&
				! e.config.performance.paused &&
				! e.lost &&
				this.fixedTime === undefined;
			e.last = null;
			if ( e.active ) e.renderer.resume();
			else e.renderer.pause();
		}
		if (
			[ ...this.entries.values() ].some( ( e ) => e.active ) &&
			! this.raf
		)
			this.raf = this.win.requestAnimationFrame( this.tick );
		else if ( ! [ ...this.entries.values() ].some( ( e ) => e.active ) ) {
			this.win.cancelAnimationFrame( this.raf );
			this.raf = null;
		}
	}
	tick( now ) {
		this.raf = null;
		for ( const e of this.entries.values() ) {
			if ( ! e.active || ! e.renderer ) continue;
			if (
				e.last === null ||
				now - e.last >= 1000 / e.config.performance.maxFps
			) {
				if ( e.last !== null )
					e.time += Math.min( 0.1, ( now - e.last ) / 1000 );
				e.last = now;
				try {
					e.renderer.update( e.time );
				} catch {
					this.release( e );
					e.failed = true;
				}
			}
		}
		if ( [ ...this.entries.values() ].some( ( e ) => e.active ) )
			this.raf = this.win.requestAnimationFrame( this.tick );
	}
	remove( root ) {
		const e = this.entries.get( root );
		if ( ! e ) return;
		this.release( e );
		e.layer.remove();
		this.intersection.unobserve( root );
		this.resizeObserver.unobserve( root );
		this.entries.delete( root );
		this.sync();
	}
	destroy() {
		for ( const root of [ ...this.entries.keys() ] ) this.remove( root );
		this.win.cancelAnimationFrame( this.raf );
		this.intersection.disconnect();
		this.resizeObserver.disconnect();
		this.motion.removeEventListener( 'change', this.onState );
		this.doc.removeEventListener( 'visibilitychange', this.onState );
		this.win.removeEventListener( 'resize', this.onResize );
		managers.delete( this.doc );
	}
}
