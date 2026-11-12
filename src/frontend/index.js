import { getManager } from './manager';
function start() {
	const manager = getManager( document );
	const mounted = new Map();
	const scan = () => {
		for ( const root of document.querySelectorAll( '[data-od-webgl]' ) ) {
			const value = root.getAttribute( 'data-od-webgl' );
			if ( mounted.get( root ) === value ) continue;
			try {
				const config = JSON.parse( value );
				if ( mounted.has( root ) ) manager.update( root, config );
				else manager.mount( root, config );
				mounted.set( root, value );
			} catch {
				manager.remove( root );
			}
		}
		for ( const root of mounted.keys() )
			if (
				! root.isConnected ||
				! root.hasAttribute( 'data-od-webgl' )
			) {
				manager.remove( root );
				mounted.delete( root );
			}
	};
	scan();
	let pending = false;
	const observer = new MutationObserver( ( records ) => {
		if (
			pending ||
			records.every( ( r ) =>
				r.target.closest?.( '.od-webgl-background' )
			)
		)
			return;
		pending = true;
		queueMicrotask( () => {
			pending = false;
			scan();
		} );
	} );
	observer.observe( document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [ 'data-od-webgl' ],
	} );
	const onPageShow = ( event ) => {
		if ( ! event.persisted ) return;
		window.removeEventListener( 'pageshow', onPageShow );
		start();
	};
	window.addEventListener( 'pageshow', onPageShow );
	window.addEventListener(
		'pagehide',
		( event ) => {
			observer.disconnect();
			manager.destroy();
			if ( ! event.persisted )
				window.removeEventListener( 'pageshow', onPageShow );
		},
		{ once: true }
	);
}
if ( document.readyState === 'loading' )
	document.addEventListener( 'DOMContentLoaded', start, { once: true } );
else start();
