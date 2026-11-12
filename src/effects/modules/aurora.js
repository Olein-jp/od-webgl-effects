import { header } from '../shader-common';
export default header +
	`void main(){vec2 p=rotated((vUv-0.5)*vec2(uResolution.x/max(uResolution.y,1.0),1.0));float t=uTime*uSpeed;float wave=sin(p.x*uScale*2.0+t)*0.2+sin(p.x*uScale*4.1-t*0.7)*0.12;float band=exp(-abs(p.y-wave*uIntensity)*mix(12.0,3.0,clamp(uGlow,0.0,2.0)/2.0));vec3 color=palette(0.5+0.5*sin(p.x*uScale+t*0.3));gl_FragColor=vec4(mix(uColors[0]*0.18,color,band*(0.5+uGlow*0.5)),uOpacity);}`;
