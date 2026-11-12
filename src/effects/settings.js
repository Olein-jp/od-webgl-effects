import definitions from '../../schemas/effects.json';
export { definitions };
export const baseColors = [ '#01273e', '#074073', '#faa500' ];
export const commonControls = [
	{ id: 'speed', type: 'range', label: 'Speed', min: 0, max: 3, step: 0.01 },
	{
		id: 'intensity',
		type: 'range',
		label: 'Intensity',
		min: 0,
		max: 2,
		step: 0.01,
	},
	{
		id: 'opacity',
		type: 'range',
		label: 'Opacity',
		min: 0,
		max: 1,
		step: 0.01,
	},
];
export const isColor = ( v ) =>
	typeof v === 'string' &&
	( /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test( v ) ||
		/^var\(--wp--preset--color--[a-z0-9-]+\)$/.test( v ) );
export const clamp = ( v, d, min, max ) =>
	typeof v === 'number' && Number.isFinite( v )
		? Math.max( min, Math.min( max, v ) )
		: d;
export function sanitizeSettings( effect, input = {} ) {
	const out = { ...effect.defaults };
	input = input && typeof input === 'object' ? input : {};
	for ( const c of [ ...commonControls, ...effect.controls ] ) {
		const v = input[ c.id ];
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
				typeof v === 'string' ? v.slice( 0, 200 ) : out[ c.id ];
	}
	out.colors =
		Array.isArray( input.colors ) && input.colors.length >= 2
			? input.colors
					.slice( 0, 5 )
					.map( ( c ) => ( isColor( c ) ? c : baseColors[ 0 ] ) )
			: [ ...baseColors ];
	return out;
}
export function normalize( raw, effects ) {
	if ( ! raw || ( raw.version ?? 1 ) !== 1 || raw.enabled !== true )
		return null;
	const effect = effects.get( raw.effect );
	if ( ! effect ) return null;
	const p = raw.performance || {};
	const qualities = [ 'auto', 'low', 'medium', 'high' ];
	return {
		...raw,
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
