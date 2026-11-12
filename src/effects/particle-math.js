export const seed = ( i, channel = 0 ) => {
	const x = Math.sin( ( i + 1 ) * 127.1 + channel * 311.7 ) * 43758.5453;
	return x - Math.floor( x );
};
export const wrap = ( v ) => v - Math.floor( v );
// 設定粒子数にかかわらず、1粒子あたり最大8候補だけを調べる。
export function connections( positions, count, distance, limit ) {
	const pairs = [];
	for ( let i = 0; i < count; i++ ) {
		let accepted = 0;
		for (
			let step = 1;
			step <= 8 && step < count && accepted < limit;
			step++
		) {
			const j = ( i + step ) % count;
			if ( j <= i ) continue;
			const dx = positions[ i * 2 ] - positions[ j * 2 ],
				dy = positions[ i * 2 + 1 ] - positions[ j * 2 + 1 ];
			if ( dx * dx + dy * dy < distance * distance ) {
				pairs.push( i, j );
				accepted++;
			}
		}
	}
	return pairs;
}
