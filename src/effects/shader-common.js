export const vertex = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position,0.0,1.0);}`;
export const header = `precision highp float;
varying vec2 vUv;
uniform float uTime,uSpeed,uIntensity,uOpacity,uScale,uGlow,uDirection,uDistortion,uMix,uAmplitude,uFrequency,uCount,uThickness,uColorCount;
uniform vec2 uResolution;
uniform vec3 uColors[5];
vec3 palette(float t){float f=clamp(t,0.0,0.9999)*(uColorCount-1.0);vec3 c=uColors[0];for(int i=0;i<4;i++){float k=clamp(f-float(i),0.0,1.0);if(float(i)<uColorCount-1.0)c=mix(c,uColors[i+1],k);}return c;}
vec2 rotated(vec2 p){float a=uDirection*0.0174532925;return mat2(cos(a),-sin(a),sin(a),cos(a))*p;}
`;
