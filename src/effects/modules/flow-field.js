import { seed, wrap } from '../particle-math';
export default {
	trails: true,
	position( i, t, s ) {
		const x = seed( i ),
			y = seed( i, 1 );
		return [
			wrap(
				x +
					t * 0.025 +
					Math.sin( y * 6 + t * 0.3 ) * 0.12 * s.drift * s.intensity
			),
			wrap(
				y + Math.cos( x * 5 + t * 0.2 ) * 0.12 * s.drift * s.intensity
			),
		];
	},
};
