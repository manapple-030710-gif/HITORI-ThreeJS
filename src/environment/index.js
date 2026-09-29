import * as THREE from 'three';
import { createSky, applySkyTime, setSkyImage, setSkyPreset } from './sky.js';
import { createWater, createWaterBed } from './water.js';
import { deriveSkyEnvironment } from './sky-image-colors.js';


export function createEnvironment(scene, settings, timeUniform) {
  const uniforms = {
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uWaterColor: { value: new THREE.Color() }, uLightDirection: { value: new THREE.Vector3() },
    uWaterCorrectionMode: { value: 0 },
    uWaterCorrectionColor: { value: new THREE.Color() },
    uLightIntensity: { value: 1 }, uStrength: { value: 0 }, uTime: timeUniform, uRoughness: { value: settings.water.roughness },
    uGeometryProof: { value: new URLSearchParams(location.search).has('geometryProof') ? 1 : 0 },
    uAmplitude: { value: settings.water.amplitude },
    uWavelength: { value: settings.water.wavelength },
    uFogStart: { value: settings.fog.start },
    uFogDensity: { value: settings.fog.density },
    uHorizonBlendWidth: { value: settings.fog.horizonBlendWidth },
    uFogColor: { value: new THREE.Color(settings.fog.color) },
    uEnvironmentZenith: { value: new THREE.Color() },
    uEnvironmentHorizon: { value: new THREE.Color() },
    uEnvironmentFog: { value: new THREE.Color() },
    uEnvironmentLight: { value: new THREE.Color() },
    uEnvironmentIntensity: { value: 1 },
    uAutoImageFog: { value: 0 },
    uBaseWaterColor: { value: new THREE.Color() },
    uBaseLightColor: { value: new THREE.Color() },
    uBaseZenith: { value: new THREE.Color() },
    uBaseHorizon: { value: new THREE.Color() },
    uBaseFogColor: { value: new THREE.Color() },
    uImageHorizon: { value: new THREE.Color() },
  };
  const sky = createSky(uniforms);
  const water = createWater(uniforms);
  const waterBed = createWaterBed(uniforms);
  if (water.material.uniforms !== uniforms || water.material.uniforms.uTime !== uniforms.uTime) {
    throw new Error('Water uniform reference mismatch');
  }
  // 後から追加する標準マテリアルのオブジェクトにも使える自然光。
  const ambient = new THREE.HemisphereLight('#f0f0ec', '#aeb9b8', 2);
  const sunlight = new THREE.DirectionalLight('#fffdf7', 0.6);
  scene.add(sky, waterBed, water, ambient, sunlight);
  let imageColors = null;
  function applyTime() {
    // 毎回手動設定から再計算し、ON/OFFや再調整で色が累積しないようにします。
    uniforms.uZenith.value.set(settings.sky.zenith);
    uniforms.uHorizon.value.set(settings.sky.horizon);
    uniforms.uWaterColor.value.set(settings.water.color);
    const correctionColors = { white: '#eef0ed', gray: '#aeb6b8', blue: '#b4c9d8' };
    const correction = settings.water.colorCorrection;
    uniforms.uWaterCorrectionMode.value = correction === 'soften' ? 1 : correctionColors[correction] ? 2 : 0;
    uniforms.uWaterCorrectionColor.value.set(correctionColors[correction] || '#ffffff');
    uniforms.uFogColor.value.set(settings.fog.color);
    applySkyTime(sky, settings);
    uniforms.uBaseWaterColor.value.copy(uniforms.uWaterColor.value);
    uniforms.uBaseLightColor.value.copy(uniforms.uEnvironmentLight.value);
    uniforms.uBaseZenith.value.copy(uniforms.uZenith.value);
    uniforms.uBaseHorizon.value.copy(uniforms.uHorizon.value);
    uniforms.uBaseFogColor.value.copy(uniforms.uFogColor.value);
    uniforms.uImageHorizon.value.copy(imageColors ? imageColors.horizon : uniforms.uEnvironmentFog.value);
    uniforms.uAutoImageFog.value = imageColors ? 1 : 0;
    if (imageColors) {
      const colors = deriveSkyEnvironment(imageColors);
      uniforms.uEnvironmentFog.value.copy(colors.fog);
      uniforms.uFogColor.value.lerp(colors.fog, 0.18);
      uniforms.uZenith.value.lerp(imageColors.upper, 0.18);
      uniforms.uHorizon.value.lerp(imageColors.horizon, 0.18);
      uniforms.uWaterColor.value.lerp(colors.water, 0.12);
      uniforms.uEnvironmentLight.value.copy(colors.light);
    }
    const intensity = uniforms.uEnvironmentIntensity.value;
    ambient.intensity = 2 * intensity;
    sunlight.intensity = 0.6 * intensity;
    ambient.color.copy(uniforms.uEnvironmentLight.value);
    ambient.groundColor.copy(uniforms.uEnvironmentFog.value);
    sunlight.color.copy(uniforms.uEnvironmentLight.value);
  }
  function apply() {
    uniforms.uZenith.value.set(settings.sky.zenith);
    uniforms.uHorizon.value.set(settings.sky.horizon);
    uniforms.uWaterColor.value.set(settings.water.color);
    uniforms.uLightDirection.value.fromArray(settings.lighting.direction).normalize();
    uniforms.uLightIntensity.value = settings.lighting.intensity;
    uniforms.uStrength.value = settings.water.strength;
    uniforms.uRoughness.value = settings.water.roughness;
    // 初期値0.75を基準に、揺らぎUIを実際の高さにも連動させます。
    uniforms.uAmplitude.value = settings.water.amplitude * settings.water.strength / 0.75;
    uniforms.uWavelength.value = Math.max(2, settings.water.wavelength);
    uniforms.uFogStart.value = settings.fog.start;
    uniforms.uFogDensity.value = settings.fog.density;
    uniforms.uHorizonBlendWidth.value = THREE.MathUtils.degToRad(
      THREE.MathUtils.clamp(settings.fog.horizonBlendWidth, 0, 2),
    );
    uniforms.uFogColor.value.set(settings.fog.color);
    sunlight.position.copy(uniforms.uLightDirection.value).multiplyScalar(100);
    applyTime();
  }
  apply();
  return {
    apply, applyTime,
    setImageColors: colors => { imageColors = colors; applyTime(); },
    setSkyImage: texture => setSkyImage(sky, texture, settings.frame.width / settings.frame.height),
    setSkyPreset: name => setSkyPreset(sky, name),
  };
}
