import { waterSpectrumGLSL } from './spectrum.js';

export const waterVertexShader = `${waterSpectrumGLSL}
varying vec3 vWorld;
varying vec2 vSwellSlope;
void main() {
  vec4 world=modelMatrix*vec4(position,1.0);
  vec3 wave=displacedSpectrum(world.xz,0.0);
  world.y+=wave.x;
  vSwellSlope=wave.yz;
  vWorld=world.xyz;
  gl_Position=projectionMatrix*viewMatrix*world;
}`;
