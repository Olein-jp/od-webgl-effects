import { header } from '../shader-common';
export default header +
	`void main(){vec2 p=rotated(vUv-0.5)*uScale;float t=uTime*uSpeed;vec2 flow=p+vec2(sin(p.y*2.7+t),cos(p.x*2.1-t*0.8))*uDistortion*uIntensity;float f=0.5+0.5*sin(flow.x+flow.y+sin(flow.y*2.0+t)*uMix*2.0+t*0.4);gl_FragColor=vec4(palette(f),uOpacity);}`;
