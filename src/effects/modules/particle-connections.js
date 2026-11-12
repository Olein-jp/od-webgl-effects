import { seed, wrap } from '../particle-math';
export default {
	connections: true,
	position( i, t, s ) {
		return [
			wrap(
				seed( i ) +
					Math.sin( t * 0.1 + i ) * 0.12 * s.drift * s.intensity
			),
			wrap(
				seed( i, 1 ) +
					Math.cos( t * 0.13 + i ) * 0.12 * s.drift * s.intensity
			),
		];
	},
};
