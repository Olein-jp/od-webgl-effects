import { header } from '../shader-common';
export default header +
	`void main(){vec2 p=(vUv-.5)*vec2(uResolution.x/max(uResolution.y,1.),1.);float r=length(p)/uSpread;float wave=sin(r*uFrequency*6.283185-uTime*uSpeed*3.)*exp(-r*uDecay)*uAmplitude*uIntensity;gl_FragColor=vec4(palette(.5+.5*wave),uOpacity);}`;
