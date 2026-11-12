import { RendererRegistry, EffectRegistry } from './registry';
import { definitions } from './settings';
import { fragments } from './shaders';
import { OGLRenderer } from '../engine/OGLRenderer';
export const renderers = new RendererRegistry();
renderers.register(
	'ogl',
	( element, effect, settings ) =>
		new OGLRenderer( element, effect, settings )
);
export const effects = new EffectRegistry( renderers );
for ( const [ id, def ] of Object.entries( definitions ) ) {
	effects.register( {
		...def,
		id,
		renderer: 'ogl',
		version: 1,
		description: def.label,
		thumbnail: id + '.svg',
		fragment: fragments[ id ],
		createRenderer: ( ...args ) => renderers.get( 'ogl' )( ...args ),
		presets: [
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
