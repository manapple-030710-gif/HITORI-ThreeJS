import * as THREE from 'three';
import { createSky } from './sky.js';
import { createWater } from './water.js';


export function createEnvironment(scene, settings, timeUniform) {
  const uniforms = {
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uWaterColor: { value: new THREE.Color() }, uLightDirection: { value: new THREE.Vector3() },
    uLightIntensity: { value: 1 }, uStrength: { value: 0 }, uTime: timeUniform, uRoughness: { value: settings.water.roughness },
    uGeometryProof: { value: new URLSearchParams(location.search).has('geometryProof') ? 1 : 0 },
    uAmplitude: { value: settings.water.amplitude },
    uWavelength: { value: settings.water.wavelength },
    uFogStart: { value: settings.fog.start },
    uFogDensity: { value: settings.fog.density },
    uFogColor: { value: new THREE.Color(settings.fog.color) },
  };
  const sky = createSky(uniforms);
  const water = createWater(uniforms);
  if (water.material.uniforms !== uniforms || water.material.uniforms.uTime !== uniforms.uTime) {
    throw new Error('Water uniform reference mismatch');
  }
  // 後から追加する標準マテリアルのオブジェクトにも使える自然光。
  const ambient = new THREE.HemisphereLight('#f0f0ec', '#aeb9b8', 2);
  const sunlight = new THREE.DirectionalLight('#fffdf7', 0.6);
  scene.add(sky, water, ambient, sunlight);
  function apply() {
    uniforms.uZenith.value.set(settings.sky.zenith);
    uniforms.uHorizon.value.set(settings.sky.horizon);
    uniforms.uWaterColor.value.set(settings.water.color);
    uniforms.uLightDirection.value.fromArray(settings.lighting.direction).normalize();
    uniforms.uLightIntensity.value = settings.lighting.intensity;
    uniforms.uStrength.value = settings.water.strength;
    uniforms.uRoughness.value = settings.water.roughness;
    uniforms.uAmplitude.value = settings.water.amplitude;
    uniforms.uWavelength.value = Math.max(2, settings.water.wavelength);
    uniforms.uFogStart.value = settings.fog.start;
    uniforms.uFogDensity.value = settings.fog.density;
    uniforms.uFogColor.value.set(settings.fog.color);
    ambient.intensity = 2 * settings.lighting.intensity;
    sunlight.intensity = 0.6 * settings.lighting.intensity;
    sunlight.position.copy(uniforms.uLightDirection.value).multiplyScalar(100);
  }
  apply();
  return { apply };
}
