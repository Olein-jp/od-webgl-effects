export const budgets = {
	low: {
		dpr: 0.75,
		fps: 20,
		pixels: 1000000,
		complexity: 0.35,
		particles: 32,
		links: 2,
	},
	medium: {
		dpr: 1,
		fps: 30,
		pixels: 2000000,
		complexity: 0.65,
		particles: 64,
		links: 3,
	},
	high: {
		dpr: 2,
		fps: 60,
		pixels: 4000000,
		complexity: 1,
		particles: 128,
		links: 4,
	},
};
const levels = [ 'low', 'medium', 'high' ];
export function requestedQuality( config, width ) {
	return width < 768
		? config.performance.mobileQuality
		: config.performance.quality;
}
export class AutoQuality {
	constructor() {
		this.level = 1;
		this.reset();
		this.changedAt = -Infinity;
	}
	reset() {
		this.previous = null;
		this.slow = 0;
		this.fast = 0;
	}
	observe( now, cost = 0 ) {
		const delta = this.previous === null ? null : now - this.previous;
		this.previous = now;
		if ( delta === null || delta > 250 || delta <= 0 ) return false;
		const slow = delta > 25 || cost > 20;
		this.slow = slow ? this.slow + 1 : 0;
		this.fast = ! slow && delta < 19 && cost < 8 ? this.fast + 1 : 0;
		let next = this.level;
		if ( this.slow >= 30 ) next = Math.max( 0, next - 1 );
		else if ( this.fast >= 300 ) next = Math.min( 2, next + 1 );
		if ( next === this.level || now - this.changedAt < 5000 ) return false;
		this.level = next;
		this.changedAt = now;
		this.reset();
		return true;
	}
	get budget() {
		return budgets[ levels[ this.level ] ];
	}
}
export function allocation( rect, devicePixelRatio, budget ) {
	const width = Math.max( 1, rect.width ),
		height = Math.max( 1, rect.height );
	return Math.min(
		devicePixelRatio || 1,
		budget.dpr,
		4096 / Math.max( width, height ),
		Math.sqrt( budget.pixels / ( width * height ) )
	);
}
