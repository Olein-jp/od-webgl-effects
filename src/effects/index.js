import { RendererRegistry, EffectRegistry } from './registry';
import { labels } from './labels';
import { definitions } from './settings';
import { loadEffect } from './loader';
const loaded = new Map();
export const renderers = new RendererRegistry();
renderers.register(
	'ogl',
	( element, effect, settings ) =>
		new ( loaded.get( effect.id ).OGLRenderer )(
			element,
			{ ...effect, fragment: loaded.get( effect.id ).fragment },
			settings
		)
);
export const effects = new EffectRegistry( renderers );
for ( const [ id, def ] of Object.entries( definitions ) ) {
	effects.register( {
		...def,
		id,
		label: labels[ def.label ] || def.label,
		controls: def.controls.map( ( control ) => ( {
			...control,
			label: labels[ control.label ] || control.label,
		} ) ),
		renderer: 'ogl',
		version: 1,
		description: def.label,
		thumbnail: id + '.svg',
		loadRenderer: () =>
			loadEffect( id ).then( ( module ) => loaded.set( id, module ) ),
		createRenderer: ( ...args ) => renderers.get( 'ogl' )( ...args ),
		presets: def.presets || [
			{
				id: 'soft-blue',
				label: 'Soft Blue',
				settings: { colors: [ '#01273e', '#074073', '#97d6f7' ] },
			},
			{
				id: 'warm',
				label: 'Warm',
				settings: { colors: [ '#41295a', '#f59d64', '#ffd976' ] },
			},
			{
				id: 'forest',
				label: 'Forest',
				settings: { colors: [ '#092e28', '#36ac82', '#c4e8ae' ] },
			},
		],
	} );
}
