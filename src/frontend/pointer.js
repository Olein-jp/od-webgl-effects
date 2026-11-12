export function coordinates( rect, clientX, clientY ) {
	const clamp = ( v ) => Math.max( 0, Math.min( 1, v ) );
	return {
		x: clamp( ( clientX - rect.left ) / Math.max( rect.width, 1 ) ),
		y: 1 - clamp( ( clientY - rect.top ) / Math.max( rect.height, 1 ) ),
	};
}
export class PointerInput {
	constructor( root ) {
		this.root = root;
		this.state = {
			x: 0.5,
			y: 0.5,
			dx: 0,
			dy: 0,
			active: false,
			down: false,
			sequence: 0,
		};
		this.move = ( event ) => {
			if ( event.pointerType === 'touch' ) return;
			const point = coordinates(
				root.getBoundingClientRect(),
				event.clientX,
				event.clientY
			);
			this.state = {
				...this.state,
				...point,
				dx: point.x - this.state.x,
				dy: point.y - this.state.y,
				active: true,
				down:
					event.type === 'pointerdown' ||
					( event.type !== 'pointerup' && this.state.down ),
				sequence:
					this.state.sequence +
					( event.type === 'pointerdown' ? 1 : 0 ),
			};
		};
		this.leave = () => {
			this.state = {
				...this.state,
				dx: 0,
				dy: 0,
				active: false,
				down: false,
			};
		};
		for ( const type of [ 'pointermove', 'pointerdown', 'pointerup' ] )
			root.addEventListener( type, this.move, { passive: true } );
		root.addEventListener( 'pointerleave', this.leave, { passive: true } );
		root.addEventListener( 'pointercancel', this.leave, { passive: true } );
	}
	sample() {
		const value = this.state;
		this.state = { ...value, dx: 0, dy: 0 };
		return value;
	}
	destroy() {
		for ( const type of [ 'pointermove', 'pointerdown', 'pointerup' ] )
			this.root.removeEventListener( type, this.move );
		this.root.removeEventListener( 'pointerleave', this.leave );
		this.root.removeEventListener( 'pointercancel', this.leave );
		this.leave();
	}
}
