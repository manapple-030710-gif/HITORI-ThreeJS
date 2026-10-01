import * as THREE from 'three';
import { createSky, applySkyTime, setSkyImage, setSkyPreset } from './sky.js';
import { createWater, createWaterBed } from './water.js';
import { deriveSkyEnvironment } from '../environment/sky-image-colors.js';


export function createEnvironment(scene, settings, timeUniform) {
  const uniforms = {
    uRandomness: { value: 0.65 }, uGrandeur: { value: 0.75 }, uCloudAmount: { value: 0.7 },
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uWaterColor: { value: new THREE.Color() }, uLightDirection: { value: new THREE.Vector3() },
    uWaterOpacity: { value: settings.water.opacity },
    uFresnelStrength: { value: settings.water.fresnelStrength },
    uReflectionStrength: { value: settings.water.reflectionStrength },
    uDepthTint: { value: settings.water.depthTint },
    uEnvironmentGain: { value: settings.rendering.environmentIntensity },
    uSpecularStrength: { value: settings.water.specularStrength },
    uSpecularSharpness: { value: settings.water.specularSharpness },
    uSpecularDirection: { value: new THREE.Vector3() },
    uMicroNormalStrength: { value: settings.water.microNormalStrength },
    uMicroNormalScale: { value: settings.water.microNormalScale },
    uMicroNormalSpeed: { value: settings.water.microNormalSpeed },
    uShallowColor: { value: new THREE.Color() },
    uDeepColor: { value: new THREE.Color() },
    uDepthVariationStrength: { value: 0 },
    uDepthVariationScale: { value: 0.06 },
    uHighlightVariation: { value: 0 },
    uHighlightVariationScale: { value: 0.13 },
    uCausticStrength: { value: 0 },
    uCausticScale: { value: 0.45 },
    uCausticSpeed: { value: 0.12 },
    uBottomVisibility: { value: 1 },
    uBottomTint: { value: new THREE.Color() },
    uBottomVariationStrength: { value: 0.3 },
    uBottomVariationScale: { value: 0.12 },
    uDepthFadeStrength: { value: 1 },
    uWaterCorrectionMode: { value: 0 },
    uWaterCorrectionColor: { value: new THREE.Color() },
    uLightIntensity: { value: 1 }, uStrength: { value: 0 }, uTime: timeUniform, uRoughness: { value: settings.water.roughness },
    uGeometryProof: { value: new URLSearchParams(location.search).has('geometryProof') ? 1 : 0 },
    uAmplitude: { value: settings.water.amplitude },
    uWavelength: { value: settings.water.wavelength },
    uLargeWaveStrength: { value: 0.7 },
    uLargeWaveScale: { value: 8 },
    uLargeWaveSpeed: { value: 0.8 },
    uMediumWaveStrength: { value: 1.2 },
    uMediumWaveScale: { value: 2.4 },
    uMediumWaveSpeed: { value: 1 },
    uSmallWaveStrength: { value: 0.8 },
    uSmallWaveScale: { value: 0.65 },
    uSmallWaveSpeed: { value: 0.85 },
    uWaveDirectionSpread: { value: 1 },
    uWaveSpeedVariation: { value: 0.8 },
    uWaveSharpness: { value: 0.35 },
    uSpecularScatter: { value: 0.8 },
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
    uniforms.uZenith.value.copy(uniforms.uEnvironmentZenith.value);
    uniforms.uHorizon.value.copy(uniforms.uEnvironmentHorizon.value);
    uniforms.uFogColor.value.copy(uniforms.uEnvironmentFog.value);
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
    ambient.intensity = 2 * intensity * uniforms.uEnvironmentGain.value;
    sunlight.intensity = 0.6 * intensity;
    ambient.color.copy(uniforms.uEnvironmentLight.value);
    ambient.groundColor.copy(uniforms.uEnvironmentFog.value);
    sunlight.color.copy(uniforms.uEnvironmentLight.value);
  }
  function apply() {
    uniforms.uRandomness.value=settings.world.randomness;
    uniforms.uGrandeur.value=settings.world.grandeur;
    uniforms.uCloudAmount.value=settings.world.clouds;
    uniforms.uLargeWaveStrength.value = THREE.MathUtils.clamp(settings.water.largeWaveStrength, 0, 3);
    uniforms.uLargeWaveScale.value = THREE.MathUtils.clamp(settings.water.largeWaveScale, 3, 30);
    uniforms.uLargeWaveSpeed.value = THREE.MathUtils.clamp(settings.water.largeWaveSpeed, 0, 3);
    uniforms.uMediumWaveStrength.value = THREE.MathUtils.clamp(settings.water.mediumWaveStrength, 0, 4);
    uniforms.uMediumWaveScale.value = THREE.MathUtils.clamp(settings.water.mediumWaveScale, 0.8, 8);
    uniforms.uMediumWaveSpeed.value = THREE.MathUtils.clamp(settings.water.mediumWaveSpeed, 0, 4);
    uniforms.uSmallWaveStrength.value = THREE.MathUtils.clamp(settings.water.smallWaveStrength, 0, 4);
    uniforms.uSmallWaveScale.value = THREE.MathUtils.clamp(settings.water.smallWaveScale, 0.15, 2);
    uniforms.uSmallWaveSpeed.value = THREE.MathUtils.clamp(settings.water.smallWaveSpeed, 0, 4);
    uniforms.uWaveDirectionSpread.value = THREE.MathUtils.clamp(settings.water.waveDirectionSpread, 0, 2);
    uniforms.uWaveSpeedVariation.value = THREE.MathUtils.clamp(settings.water.waveSpeedVariation, 0, 2);
    uniforms.uWaveSharpness.value = THREE.MathUtils.clamp(settings.water.waveSharpness, 0, 1);
    uniforms.uSpecularScatter.value = THREE.MathUtils.clamp(settings.water.specularScatter, 0, 2);
    uniforms.uBottomVisibility.value = THREE.MathUtils.clamp(settings.water.bottomVisibility, 0, 1);
    uniforms.uBottomTint.value.set(settings.water.bottomTint);
    uniforms.uBottomVariationStrength.value = THREE.MathUtils.clamp(settings.water.bottomVariationStrength, 0, 0.6);
    uniforms.uBottomVariationScale.value = THREE.MathUtils.clamp(settings.water.bottomVariationScale, 0.03, 0.4);
    uniforms.uDepthFadeStrength.value = THREE.MathUtils.clamp(settings.water.depthFadeStrength, 0.75, 2.5);
    uniforms.uShallowColor.value.set(settings.water.shallowColor);
    uniforms.uDeepColor.value.set(settings.water.deepColor);
    uniforms.uDepthVariationStrength.value = THREE.MathUtils.clamp(settings.water.depthVariationStrength, 0, 0.5);
    uniforms.uDepthVariationScale.value = THREE.MathUtils.clamp(settings.water.depthVariationScale, 0.02, 0.3);
    uniforms.uHighlightVariation.value = THREE.MathUtils.clamp(settings.water.highlightVariation, 0, 0.5);
    uniforms.uHighlightVariationScale.value = THREE.MathUtils.clamp(settings.water.highlightVariationScale, 0.03, 0.5);
    uniforms.uCausticStrength.value = THREE.MathUtils.clamp(settings.water.causticStrength, 0, 0.12);
    uniforms.uCausticScale.value = THREE.MathUtils.clamp(settings.water.causticScale, 0.1, 1.5);
    uniforms.uCausticSpeed.value = THREE.MathUtils.clamp(settings.water.causticSpeed, 0, 0.5);
    uniforms.uSpecularStrength.value = THREE.MathUtils.clamp(settings.water.specularStrength, 0, 1);
    uniforms.uSpecularSharpness.value = THREE.MathUtils.clamp(settings.water.specularSharpness, 8, 160);
    uniforms.uSpecularDirection.value.set(settings.water.lightDirectionX, settings.water.lightDirectionY, settings.water.lightDirectionZ);
    // ゼロベクトルはハイライトなし。normalize時の不定値を避けます。
    if (uniforms.uSpecularDirection.value.lengthSq() > 0) uniforms.uSpecularDirection.value.normalize();
    uniforms.uMicroNormalStrength.value = THREE.MathUtils.clamp(settings.water.microNormalStrength, 0, 0.025);
    uniforms.uMicroNormalScale.value = THREE.MathUtils.clamp(settings.water.microNormalScale, 1, 12);
    uniforms.uMicroNormalSpeed.value = THREE.MathUtils.clamp(settings.water.microNormalSpeed, 0, 0.6);
    uniforms.uEnvironmentGain.value = THREE.MathUtils.clamp(settings.rendering.environmentIntensity, 0, 1.5);
    uniforms.uZenith.value.set(settings.sky.zenith);
    uniforms.uHorizon.value.set(settings.sky.horizon);
    uniforms.uWaterColor.value.set(settings.water.color);
    uniforms.uLightDirection.value.fromArray(settings.lighting.direction).normalize();
    uniforms.uLightIntensity.value = settings.lighting.intensity;
    uniforms.uStrength.value = settings.water.strength;
    uniforms.uRoughness.value = settings.water.roughness;
    uniforms.uWaterOpacity.value = THREE.MathUtils.clamp(settings.water.opacity, 0, 1);
    uniforms.uFresnelStrength.value = THREE.MathUtils.clamp(settings.water.fresnelStrength, 0, 1.5);
    uniforms.uReflectionStrength.value = THREE.MathUtils.clamp(settings.water.reflectionStrength, 0, 1.5);
    uniforms.uDepthTint.value = THREE.MathUtils.clamp(settings.water.depthTint, 0, 2);
    // 初期値0.75までは従来どおり。最大側は1.6倍へ滑らかに強調します。
    const swellGain = 1 + 0.6 * THREE.MathUtils.smoothstep(settings.water.strength, 0.75, 2.5);
    uniforms.uAmplitude.value = settings.water.amplitude * settings.water.strength / 0.75 * swellGain;
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
    apply, applyTime, uniforms,
    objects: { sky, water: scene.getObjectByName("Multiscale water") },
    setImageColors: colors => { imageColors = colors; applyTime(); },
    setSkyImage: texture => setSkyImage(sky, texture, settings.frame.width / settings.frame.height),
    setSkyPreset: name => setSkyPreset(sky, name),
  };
}
