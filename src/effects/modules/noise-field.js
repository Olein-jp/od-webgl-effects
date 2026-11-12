import { header } from '../shader-common';
export default header +
	`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec2 p=rotated(vUv-.5)*uScale;float t=uTime*uSpeed;p+=vec2(noise(p+t*.3),noise(p-t*.2))*uWarp*uIntensity*2.;float n=noise(p+t*.1);gl_FragColor=vec4(palette(n),uOpacity);}`;
