import { seed, wrap } from '../particle-math';
export default {
	position( i, t, s ) {
		return [
			wrap(
				seed( i ) +
					Math.sin( t * 0.2 + i ) * 0.06 * s.drift * s.intensity
			),
			wrap( seed( i, 1 ) + t * 0.025 * ( 0.5 + seed( i, 2 ) ) ),
		];
	},
};
