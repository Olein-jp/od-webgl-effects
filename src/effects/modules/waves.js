import { header } from '../shader-common';
export default header +
	`void main(){vec2 p=vUv;vec3 color=uColors[0];float t=uTime*uSpeed;for(int i=0;i<12;i++){if(float(i)>=uCount)break;float offset=(float(i)+1.0)/(uCount+1.0);float wave=offset+sin(p.x*uFrequency*6.283185+t+float(i)*0.6)*uAmplitude*uIntensity;float d=abs(p.y-wave);float edge=max(1.0/max(uResolution.y,1.0),0.001);float line=1.0-smoothstep(uThickness,uThickness+edge,d);color=mix(color,palette((float(i)+1.0)/uCount),line);}gl_FragColor=vec4(color,uOpacity);}`;
