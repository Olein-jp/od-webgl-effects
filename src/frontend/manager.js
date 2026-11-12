import { PointerInput } from './pointer';
import { AutoQuality, budgets, requestedQuality, allocation } from './quality';
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
					if ( e ) {
						e.visible = item.isIntersecting;
						e.ratio = item.intersectionRatio ?? 1;
					}
				}
				this.sync();
			},
			{ rootMargin: '0px', threshold: [ 0, 0.25, 0.5, 0.75, 1 ] }
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
			auto: new AutoQuality(),
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
		const q = requestedQuality( e.config, this.win.innerWidth );
		e.budget = q === 'auto' ? e.auto.budget : budgets[ q ];
		const bound = allocation( rect, this.win.devicePixelRatio, e.budget );
		e.renderer.setQuality?.( e.budget );
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
		e.root.classList.remove( 'has-od-webgl-canvas' );
		e.generation = ( e.generation || 0 ) + 1;
		e.loading = false;
		if ( e.canvas ) {
			e.canvas.removeEventListener( 'webglcontextlost', e.onLost );
			e.canvas.removeEventListener(
				'webglcontextrestored',
				e.onRestored
			);
		}
		e.pointer?.destroy();
		e.pointer = null;
		e.renderer?.destroy();
		e.renderer = null;
		e.canvas = null;
		e.active = false;
		e.last = null;
		e.auto.reset();
	}
	initialize( e ) {
		e.loading = true;
		const generation = e.generation || 0;
		const effect = effects.get( e.config.effect );
		// GPUを確保する前にもトークンを確認し、古い読み込みの描画開始を防ぐ。
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
				e.root.classList.add( 'has-od-webgl-canvas' );
				checkLifecycle( renderer );
				e.loading = false;
				e.canvas = e.layer.querySelector( 'canvas' );
				e.onLost = ( event ) => {
					event.preventDefault();
					e.lost = true;
					e.root.classList.remove( 'has-od-webgl-canvas' );
					if ( e.canvas ) e.canvas.style.visibility = 'hidden';
					e.pointer?.destroy();
					e.pointer = null;
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
			( a, b ) =>
				Number( b.live ) - Number( a.live ) ||
				( b.ratio || 0 ) - ( a.ratio || 0 )
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
			if ( ! e.active ) e.auto.reset();
			if ( e.active && e.config.settings.interactive === true ) {
				if ( ! e.pointer ) {
					e.pointer = new PointerInput( e.root );
					e.pointerSequence = 0;
					e.pointerTime = 0;
				}
			} else {
				e.pointer?.destroy();
				e.pointer = null;
				e.renderer.setPointer?.(
					{ x: 0.5, y: 0.5, active: false, down: false },
					0
				);
			}
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
				requestedQuality( e.config, this.win.innerWidth ) === 'auto' &&
				e.auto.observe( now, e.renderCost || 0 )
			)
				this.resize( e );
			if (
				e.last === null ||
				now - e.last >=
					1000 /
						Math.min(
							e.config.performance.maxFps,
							e.budget?.fps || 30
						)
			) {
				if ( e.last !== null )
					e.time += Math.min( 0.1, ( now - e.last ) / 1000 );
				e.last = now;
				try {
					if ( e.pointer ) {
						const input = e.pointer.sample();
						if (
							input.sequence > 0 &&
							input.sequence !== e.pointerSequence
						) {
							e.pointerSequence = input.sequence;
							e.pointerTime = e.time;
						}
						e.renderer.setPointer?.( input, e.pointerTime || 0 );
					}
					const started = this.win.performance.now();
					e.renderer.update( e.time );
					e.renderCost = this.win.performance.now() - started;
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
