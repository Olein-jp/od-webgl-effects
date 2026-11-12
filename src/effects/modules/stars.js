import { seed, wrap } from '../particle-math';
export default {
	stars: true,
	position( i, t, s ) {
		return [
			wrap( seed( i ) + t * 0.003 * s.drift * s.intensity ),
			wrap( seed( i, 1 ) + t * 0.006 * s.drift * s.intensity ),
		];
	},
};
