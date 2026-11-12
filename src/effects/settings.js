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
export function sanitizeFallback( input ) {
	input = input && typeof input === 'object' ? input : {};
	const out = {
		color:
			input.color === '' || input.color === 'transparent'
				? 'transparent'
				: isColor( input.color )
					? input.color
					: '#01273e',
	};
	if (
		Number.isInteger( input.imageId ) &&
		input.imageId > 0 &&
		input.imageId <= 2147483647
	) {
		out.imageId = input.imageId;
		out.fit = [ 'cover', 'contain' ].includes( input.fit )
			? input.fit
			: 'cover';
		out.position = [ 'center', 'top', 'bottom', 'left', 'right' ].includes(
			input.position
		)
			? input.position
			: 'center';
	}
	return out;
}
export function fallbackImageValue( url ) {
	if (
		typeof url !== 'string' ||
		! /^https?:\/\//i.test( url ) ||
		/[\u0000-\u001f\u007f]/.test( url )
	)
		return 'none';
	return (
		'url("' +
		url.replace( /["'()\\]/g, ( c ) =>
			encodeURIComponent( c )
				.replace( /'/g, '%27' )
				.replace( /\(/g, '%28' )
				.replace( /\)/g, '%29' )
		) +
		'")'
	);
}
export function sanitizeUserPresets( input, effects ) {
	const seen = new Set();
	return ( Array.isArray( input ) ? input.slice( 0, 10 ) : [] ).flatMap(
		( p ) => {
			if (
				! p ||
				typeof p !== 'object' ||
				typeof p.id !== 'string' ||
				! /^user-[a-z0-9-]{1,35}$/.test( p.id ) ||
				seen.has( p.id ) ||
				typeof p.name !== 'string' ||
				typeof p.effect !== 'string'
			)
				return [];
			const effect = effects.get( p.effect );
			const name = Array.from(
				p.name.replace( /[\u0000-\u001f\u007f]/g, '' ).trim()
			)
				.slice( 0, 80 )
				.join( '' );
			if ( ! effect || ! name ) return [];
			seen.add( p.id );
			return [
				{
					id: p.id,
					name,
					effect: p.effect,
					settings: sanitizeSettings( effect, p.settings ),
				},
			];
		}
	);
}
export function saveUserPreset( state, name, id, effects ) {
	const presets = sanitizeUserPresets(
		[
			...( state.userPresets || [] ),
			{ id, name, effect: state.effect, settings: state.settings },
		],
		effects
	);
	return {
		...state,
		userPresets: presets,
		preset: presets.some( ( p ) => p.id === id ) ? id : state.preset,
	};
}
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
		...( Object.prototype.hasOwnProperty.call( raw, 'userPresets' )
			? { userPresets: sanitizeUserPresets( raw.userPresets, effects ) }
			: {} ),
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
		fallback: sanitizeFallback( raw.fallback ),
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
