import definitions from '../../schemas/effects.json';
export { definitions };
import common from '../../schemas/common.json';
export const baseColors = common.colors;
export const commonControls = common.controls;
export const isColor = ( v ) =>
	typeof v === 'string' &&
	v.trim() === v &&
	( /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test( v ) ||
		/^var\(--wp--preset--color--[a-z0-9-]+\)$/.test( v ) );
export const clamp = ( v, d, min, max ) =>
	typeof v === 'number' && Number.isFinite( v )
		? Math.max( min, Math.min( max, v ) )
		: d;
export function sanitizeSettings( effect, input = {} ) {
	const out = {};
	input = input && typeof input === 'object' ? input : {};
	for ( const c of [ ...commonControls, ...effect.controls ] ) {
		const v = input[ c.id ];
		out[ c.id ] = effect.defaults[ c.id ] ?? null;
		if ( [ 'range', 'number' ].includes( c.type ) )
			out[ c.id ] = clamp( v, out[ c.id ], c.min ?? -1e6, c.max ?? 1e6 );
		else if ( c.type === 'toggle' )
			out[ c.id ] = typeof v === 'boolean' ? v : out[ c.id ];
		else if ( c.type === 'select' )
			out[ c.id ] = c.options.some( ( o ) => o.value === v )
				? v
				: out[ c.id ];
		else if ( [ 'color', 'colorPalette' ].includes( c.type ) )
			out[ c.id ] = isColor( v ) ? v : out[ c.id ];
		else if ( c.type === 'text' )
			out[ c.id ] =
				typeof v === 'string'
					? Array.from( v ).slice( 0, 200 ).join( '' )
					: out[ c.id ];
	}
	out.colors =
		Array.isArray( input.colors ) && input.colors.length >= 2
			? input.colors
					.slice( 0, 5 )
					.map( ( c ) => ( isColor( c ) ? c : baseColors[ 0 ] ) )
			: [ ...baseColors ];
	return out;
}
// Validation is separate from activation so PHP and JS also agree on disabled data.
export function sanitizeConfig( raw, effects ) {
	if (
		! raw ||
		typeof raw !== 'object' ||
		Array.isArray( raw ) ||
		( raw.version ?? 1 ) !== 1
	)
		return null;
	const id = raw.effect ?? 'aurora';
	const effect = typeof id === 'string' ? effects.get( id ) : null;
	if ( ! effect ) return null;
	const p = raw.performance || {};
	const qualities = [ 'auto', 'low', 'medium', 'high' ];
	return {
		version: 1,
		enabled: raw.enabled === true,
		effect: id,
		preset:
			typeof raw.preset === 'string'
				? raw.preset
						.replace( /[A-Z]/g, ( c ) => c.toLowerCase() )
						.replace( /[^a-z0-9_-]/g, '' )
				: '',
		settings: sanitizeSettings( effect, raw.settings ),
		performance: {
			quality: qualities.includes( p.quality ) ? p.quality : 'auto',
			mobileQuality: qualities.includes( p.mobileQuality )
				? p.mobileQuality
				: 'low',
			maxFps: clamp( p.maxFps, 30, 1, 60 ),
			paused: p.paused === true,
		},
		fallback: {
			color: isColor( raw.fallback?.color )
				? raw.fallback.color
				: baseColors[ 0 ],
		},
	};
}
export function normalize( raw, effects ) {
	const config = sanitizeConfig( raw, effects );
	return config?.enabled ? config : null;
}
// Switch only effect-specific controls; preserve the palette and common settings.
export function switchEffect( state, id, effects ) {
	const effect = effects.get( id );
	if ( ! effect ) return state;
	const shared = { colors: state.settings.colors };
	for ( const c of commonControls ) shared[ c.id ] = state.settings[ c.id ];
	return {
		...state,
		effect: id,
		preset: '',
		settings: sanitizeSettings( effect, { ...effect.defaults, ...shared } ),
	};
}
export function applyPreset( state, preset, effects ) {
	const effect = effects.get( state.effect );
	if ( ! effect || ! preset ) return state;
	return {
		...state,
		preset: preset.id,
		settings: sanitizeSettings( effect, {
			...effect.defaults,
			...preset.settings,
		} ),
	};
}
