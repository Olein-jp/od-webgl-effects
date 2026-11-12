export const vertex = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position,0.0,1.0);}`;
const header = `precision highp float;
varying vec2 vUv;
uniform float uTime,uSpeed,uIntensity,uOpacity,uScale,uGlow,uDirection,uDistortion,uMix,uAmplitude,uFrequency,uCount,uThickness,uColorCount;
uniform vec2 uResolution;
uniform vec3 uColors[5];
vec3 palette(float t){float f=clamp(t,0.0,0.9999)*(uColorCount-1.0);vec3 c=uColors[0];for(int i=0;i<4;i++){float k=clamp(f-float(i),0.0,1.0);if(float(i)<uColorCount-1.0)c=mix(c,uColors[i+1],k);}return c;}
vec2 rotated(vec2 p){float a=uDirection*0.0174532925;return mat2(cos(a),-sin(a),sin(a),cos(a))*p;}
`;
export const fragments = {
	aurora:
		header +
		`void main(){vec2 p=rotated((vUv-0.5)*vec2(uResolution.x/max(uResolution.y,1.0),1.0));float t=uTime*uSpeed;float wave=sin(p.x*uScale*2.0+t)*0.2+sin(p.x*uScale*4.1-t*0.7)*0.12;float band=exp(-abs(p.y-wave*uIntensity)*mix(12.0,3.0,clamp(uGlow,0.0,2.0)/2.0));vec3 color=palette(0.5+0.5*sin(p.x*uScale+t*0.3));gl_FragColor=vec4(mix(uColors[0]*0.18,color,band*(0.5+uGlow*0.5)),uOpacity);}`,
	'fluid-gradient':
		header +
		`void main(){vec2 p=rotated(vUv-0.5)*uScale;float t=uTime*uSpeed;vec2 flow=p+vec2(sin(p.y*2.7+t),cos(p.x*2.1-t*0.8))*uDistortion*uIntensity;float f=0.5+0.5*sin(flow.x+flow.y+sin(flow.y*2.0+t)*uMix*2.0+t*0.4);gl_FragColor=vec4(palette(f),uOpacity);}`,
	waves:
		header +
		`void main(){vec2 p=vUv;vec3 color=uColors[0];float t=uTime*uSpeed;for(int i=0;i<12;i++){if(float(i)>=uCount)break;float offset=(float(i)+1.0)/(uCount+1.0);float wave=offset+sin(p.x*uFrequency*6.283185+t+float(i)*0.6)*uAmplitude*uIntensity;float d=abs(p.y-wave);float edge=max(1.0/max(uResolution.y,1.0),0.001);float line=1.0-smoothstep(uThickness,uThickness+edge,d);color=mix(color,palette((float(i)+1.0)/uCount),line);}gl_FragColor=vec4(color,uOpacity);}`,
};
