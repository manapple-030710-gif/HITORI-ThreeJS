import * as THREE from 'three';

// 水面の反射にも同じ空の関数を使い、空と水の色調を揃えます。
export const skyGLSL = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uLightDirection;
uniform float uLightIntensity;
uniform vec3 uFogColor;
uniform float uFogDensity;
vec3 skyColor(vec3 direction) {
  float height = pow(clamp(direction.y, 0.0, 1.0), 0.55);
  vec3 color = mix(uHorizon, uZenith, height);
  // A narrow horizon haze keeps the sky and distant water in the same fog color.
  // Only the low sky is affected; zero density restores the original sky.
  float horizonHaze = (1.0-exp(-max(uFogDensity,0.0)*16000.0))
    * exp(-max(direction.y,0.0)*70.0);
  color = mix(color,uFogColor,horizonHaze);
  float alignment = max(dot(direction, uLightDirection), 0.0);
  // Broad overcast daylight, shared with the water's rough reflection.
  float softLight = pow(alignment, 5.0) * 0.10 + pow(alignment, 32.0) * 0.055;
  return (color + vec3(1.0, 0.99, 0.96) * softLight) * uLightIntensity;
}
`;

export function createSky(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `${skyGLSL}
      varying vec3 vDirection;
      void main() {
        gl_FragColor = vec4(skyColor(normalize(vDirection)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), material);
  mesh.name = 'Overcast sky';
  return mesh;
}
