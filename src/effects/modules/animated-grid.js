import { header } from '../shader-common';
export default header +
	`void main(){vec2 p=(vUv-.5)*vec2(uResolution.x/max(uResolution.y,1.),1.);float t=uTime*uSpeed;p+=vec2(sin(p.y*uFrequency+t),cos(p.x*uFrequency-t))*uWarp*uIntensity;vec2 cell=abs(fract(p*uSpacing)-.5);float dist=min(cell.x,cell.y);float aa=max(uSpacing/max(uResolution.y,1.),.001);float line=1.-smoothstep(uThickness,uThickness+aa,dist);vec3 color=mix(uColors[0],palette(.5+.5*sin(p.x+p.y+t)),line);gl_FragColor=vec4(color,uOpacity);}`;
