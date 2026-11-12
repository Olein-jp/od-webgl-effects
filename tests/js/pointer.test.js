import {coordinates,PointerInput} from '../../src/frontend/pointer';
test('coordinates clamp, invert Y, and respect current scroll/resize rectangles',()=>{
 expect(coordinates({left:100,top:200,width:200,height:100},200,225)).toEqual({x:.5,y:.75});
 expect(coordinates({left:0,top:0,width:0,height:0},-20,20)).toEqual({x:0,y:0});
});
test('passive pointer input ignores touch, resets exit, and removes listeners',()=>{
 const root=document.createElement('div');root.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});const p=new PointerInput(root);
 const fire=(type,props)=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);root.dispatchEvent(e);expect(e.defaultPrevented).toBe(false);};
 fire('pointermove',{clientX:75,clientY:25,pointerType:'mouse'});expect(p.sample()).toMatchObject({x:.75,y:.75,active:true});
 fire('pointerdown',{clientX:75,clientY:25,pointerType:'mouse'});expect(p.sample()).toMatchObject({down:true,sequence:1});
 fire('pointermove',{clientX:0,clientY:0,pointerType:'touch'});expect(p.sample().x).toBe(.75);
 fire('pointerleave',{});expect(p.sample().active).toBe(false);p.destroy();fire('pointermove',{clientX:0,clientY:0,pointerType:'mouse'});expect(p.sample().active).toBe(false);
});
