import * as THREE from 'three';
import { skyGLSL } from './sky.js';
import { waterVertexShader } from '../animation/water-vertex.js';

export function createWater(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: waterVertexShader,
    fragmentShader: `${skyGLSL}
      uniform float uTime;
      uniform float uStrength;
      uniform float uRoughness;
      uniform float uFogStart;
      uniform vec3 uWaterColor;
      uniform float uGeometryProof;
      varying vec3 vWorld;
      varying vec2 vSwellSlope;
      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx)*0.1031);
        q += dot(q,q.yzx+33.33);
        return fract((q.x+q.y)*q.z);
      }
      // Quintic noise and its analytic gradient: continuous, non-repeating normals.
      vec3 noiseGradient(vec2 p) {
        vec2 i=floor(p), f=fract(p);
        vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
        vec2 du=30.0*f*f*(f*(f-2.0)+1.0);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        float k=a-b-c+d;
        return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du*(vec2(b-a,c-a)+k*u.yx));
      }
      void main() {
        vec2 p=vWorld.xz;
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        vec2 slope=vec2(0.0);
        // Twelve directions with spatial phase modulation break coherent stripes.
        vec3 warp=noiseGradient(p*0.19+vec2(uTime*0.06,-uTime*0.04));
        for(int i=0;i<12;i++) {
          float fi=float(i), angle=fi*2.399963+0.73;
          vec2 dir=vec2(cos(angle),sin(angle));
          float k=0.55*pow(1.23,fi);
          float fade=1.0-smoothstep(0.35,2.5,footprint*k);
          float phase=dot(p,dir)*k+warp.x*3.2+fi*7.31-uTime*sqrt(k)*1.8;
          slope+=cos(phase)*(dir+warp.yz*0.19*3.2/k)*(0.008/pow(1.08,fi))*fade;
        }
        // Rotated noise octaves add irregular capillary waves at six scales.
        float frequency=2.6, amplitude=0.055, unresolved=0.0;
        for(int i=0;i<6;i++) {
          float fi=float(i), angle=fi*1.713;
          mat2 rotation=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
          vec2 drift=vec2(0.22,-0.17)*uTime*(1.0+fi*0.23);
          vec3 n=noiseGradient(rotation*p*frequency+drift+fi*13.7);
          float fade=1.0-smoothstep(0.25,1.4,footprint*frequency);
          slope+=transpose(rotation)*n.yz*amplitude*fade;
          unresolved+=amplitude*amplitude*(1.0-fade*fade);
          frequency*=2.07;
          amplitude*=0.77;
        }
        vec2 surfaceSlope = vSwellSlope + slope*uStrength;
        vec3 normal=normalize(vec3(-surfaceSlope.x,1.0,-surfaceSlope.y));
        vec3 view=normalize(cameraPosition-vWorld);
        normal=normalize(mix(vec3(0,1,0),normal,smoothstep(0.0,0.12,view.y)));
        float nv=max(dot(normal,view),0.001);
        vec3 reflected=reflect(-view,normal);
        float roughness=clamp(uRoughness+sqrt(unresolved)*uStrength,0.04,0.65);
        // Integrate a broad sky lobe; unresolved detail becomes roughness, not sparkle.
        vec3 tangent=normalize(cross(vec3(0,1,0),reflected));
        vec3 bitangent=cross(reflected,tangent);
        float spread=roughness*roughness*2.5;
        vec3 reflection=skyColor(reflected)*0.40;
        reflection+=skyColor(normalize(reflected+tangent*spread))*0.15;
        reflection+=skyColor(normalize(reflected-tangent*spread))*0.15;
        reflection+=skyColor(normalize(reflected+bitangent*spread))*0.15;
        reflection+=skyColor(normalize(reflected-bitangent*spread))*0.15;
        // Schlick Fresnel for water (IOR 1.333, F0 0.0204).
        float fresnel=0.0204+0.9796*pow(1.0-nv,5.0);
        fresnel=mix(fresnel,0.0204,roughness*0.16);
        // Bright neutral shallow-bed contribution instead of dark deep-water absorption.
        vec3 transmitted=uWaterColor*uLightIntensity*0.90;
        vec3 color=mix(transmitted,reflection,fresnel);
        float fogDistance=max(length(cameraPosition-vWorld)-uFogStart,0.0);
        float fogAmount=1.0-exp(-fogDistance*max(uFogDensity,0.0));
        // Shared horizon function includes the configured fog color and soft daylight.
        vec3 horizon=skyColor(normalize(vec3(-view.x,0.0,-view.z)));
        color=mix(color,horizon,fogAmount);
        if (uGeometryProof > 0.5) color = mix(color, vec3(0.05,0.18,0.22), 0.7);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  // 148,225 vertices / 294,912 triangles. Dense nearby, wide coverage at the horizon.
  // A uniform 16km grid would leave near-camera vertices far too sparse.
  const proof = uniforms.uGeometryProof.value > 0.5;
  const geometry = new THREE.PlaneGeometry(proof ? 16 : 16000, proof ? 16 : 16000,
    proof ? 128 : 384, proof ? 128 : 384);
  if (!proof) {
    const positions = geometry.attributes.position;
    const distribute = coordinate => {
      const u = coordinate / 8000;
      return 25*u + 7975*Math.pow(u,5);
    };
    for (let i=0; i<positions.count; i++) {
      positions.setXY(i, distribute(positions.getX(i)), distribute(positions.getY(i)));
    }
    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
  const mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.x=-Math.PI/2;
  if (proof) mesh.position.z = -12;
  // Shader displacement is not represented by CPU bounds.
  mesh.frustumCulled = false;
  mesh.name='Multiscale water';
  return mesh;
}


