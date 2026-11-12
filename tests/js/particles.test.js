import {connections,seed} from '../../src/effects/particle-math';
import floating from '../../src/effects/modules/floating-particles';
import linked from '../../src/effects/modules/particle-connections';
import flow from '../../src/effects/modules/flow-field';
import stars from '../../src/effects/modules/stars';
test.each([floating,linked,flow,stars])('fixed seeds and time reproduce finite wrapped positions',effect=>{
 const s={drift:3,intensity:.7};for(let i=0;i<128;i++)for(const time of [0,1,100000]){
 const a=effect.position(i,time,s);expect(a).toEqual(effect.position(i,time,s));for(const v of a){expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThan(1);}}
 expect(seed(1)).not.toBe(seed(2));
});
test('connections have a strict linear bound even with coincident particles',()=>{
 const positions=new Float32Array(256);for(const count of [32,64,128])for(const limit of [2,3,4]){
 const pairs=connections(positions,count,1,limit);expect(pairs.length).toBeLessThanOrEqual(count*limit*2);for(let k=0;k<pairs.length;k+=2)expect(pairs[k]).toBeLessThan(pairs[k+1]);}
});
