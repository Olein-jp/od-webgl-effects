export class RendererRegistry {
	constructor() {
		this.items = new Map();
	}
	register( id, factory ) {
		if (
			! /^[a-z][a-z0-9-]*$/.test( id ) ||
			this.items.has( id ) ||
			typeof factory !== 'function'
		)
			throw new TypeError( 'Invalid or duplicate renderer' );
		this.items.set( id, factory );
	}
	get( id ) {
		return this.items.get( id );
	}
}
export class EffectRegistry {
	constructor( renderers ) {
		this.items = new Map();
		this.renderers = renderers;
	}
	register( effect ) {
		const types = [
			'range',
			'select',
			'toggle',
			'color',
			'colorPalette',
			'number',
			'text',
		];
		if (
			! effect ||
			! /^[a-z][a-z0-9-]*$/.test( effect.id ) ||
			this.items.has( effect.id ) ||
			typeof effect.label !== 'string' ||
			! this.renderers.get( effect.renderer ) ||
			typeof effect.createRenderer !== 'function' ||
			! effect.defaults ||
			! Array.isArray( effect.controls ) ||
			effect.controls.some(
				( c ) => ! c.id || ! types.includes( c.type )
			)
		)
			throw new TypeError( 'Invalid or duplicate effect' );
		this.items.set( effect.id, Object.freeze( effect ) );
	}
	unregister( id ) {
		this.items.delete( id );
	}
	get( id ) {
		return this.items.get( id );
	}
	getAll() {
		return [ ...this.items.values() ];
	}
}
export function checkLifecycle( renderer ) {
	if (
		[
			'update',
			'resize',
			'setSettings',
			'pause',
			'resume',
			'destroy',
		].some( ( method ) => typeof renderer?.[ method ] !== 'function' )
	)
		throw new TypeError( 'Invalid renderer lifecycle' );
	return renderer;
}
