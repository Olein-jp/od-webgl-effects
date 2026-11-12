import { header } from '../shader-common';
export default header +
	`void main(){vec2 p=rotated(vUv-.5)*uScale;float t=uTime*uSpeed;vec3 color=vec3(0.);float total=0.;for(int i=0;i<5;i++){if(float(i)>=uColorCount)break;float f=float(i);vec2 center=vec2(sin(f*2.4+t*.3),cos(f*3.1-t*.25))*uSpread*(.5+.5*uIntensity);float weight=exp(-length(p-center)*uBlend);color+=uColors[i]*weight;total+=weight;}gl_FragColor=vec4(color/max(total,.00001),uOpacity);}`;
