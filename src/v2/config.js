import * as THREE from 'three';
import { defaults } from '../config.js';

export const presets = {
  'HITORI Grandeur': { height: 0.56, speed: 0.65, randomness: 0.72, grandeur: 0.82, clarity: 0.55, sky: 'Silver Break', time: 15, camera: 'Grandeur', framing: 0.5, color: '#a5bbc4', exposure: 1 },
  'Calm Water': { height: 0.18, speed: 0.35, randomness: 0.32, grandeur: 0.2, clarity: 0.85, sky: 'Morning', time: 7, camera: 'Close', framing: 0.4, color: '#b7c8cc', exposure: 1 },
  'Open Water': { height: 0.75, speed: 0.8, randomness: 0.9, grandeur: 1, clarity: 0.3, sky: 'Silver Break', time: 14, camera: 'Grandeur', framing: 0.65, color: '#97afbd', exposure: 1 },
  'Deep Mist': { height: 0.34, speed: 0.45, randomness: 0.65, grandeur: 0.65, clarity: 0.35, sky: 'Overcast', time: 10, camera: 'Wide', framing: 0.5, color: '#b4c2c8', exposure: 1 },
};
export const skyPresets = {
  'Silver Break': { zenith: '#617c92', horizon: '#c4d1dc', clouds: 0.85, exposure: 1.02, haze: 1 },
  Morning: { zenith: '#9ab4c8', horizon: '#e4dace', clouds: 0.55, exposure: 1.03, haze: 0.85 },
  Overcast: { zenith: '#89959f', horizon: '#cbd3d8', clouds: 1, exposure: 1.07, haze: 1.5 },
  Evening: { zenith: '#7e839c', horizon: '#c1b8c8', clouds: 0.65, exposure: 1, haze: 0.9 },
  Night: { zenith: '#26364e', horizon: '#65788d', clouds: 0.6, exposure: 0.95, haze: 0.8 },
};
const mix=THREE.MathUtils.lerp;
export function deriveSettings(macro, overrides = {}) {
  const s=structuredClone(defaults), w=s.water;
  const r=macro.randomness, g=macro.grandeur, h=macro.height;
  const sky=skyPresets[macro.sky];
  s.world={randomness:r,grandeur:g,clouds:sky.clouds};
  s.sky={zenith:sky.zenith,horizon:sky.horizon,time:macro.time};
  s.fog={color:sky.horizon,start:mix(35,110,g),density:(macro.scene==='Deep Mist'?0.003:0.00065)*sky.haze,horizonBlendWidth:0.22};
  s.rendering.exposure=macro.exposure*sky.exposure;
  s.rendering.environmentIntensity=1;
  const altitude=0.08+0.22*Math.max(0,Math.sin((macro.time-6)/12*Math.PI));
  s.lighting.direction=[-0.32,altitude,-1];
  Object.assign(w,{
    color:macro.color, speed:macro.speed, strength:mix(0.12,1.65,h),
    largeWaveStrength:mix(0.12,0.9,h)*mix(0.65,1.3,g),
    largeWaveScale:mix(4,22,g),largeWaveSpeed:0.48,
    mediumWaveStrength:mix(0.25,2.8,h)*mix(0.6,1.35,r),
    mediumWaveScale:mix(1.1,4.2,g),mediumWaveSpeed:0.83,
    smallWaveStrength:mix(0.15,2.6,h)*mix(0.3,1.7,r),
    smallWaveScale:mix(0.24,0.85,g),smallWaveSpeed:1.23,
    waveDirectionSpread:mix(0.25,1.8,r),waveSpeedVariation:mix(0.1,1.9,r),
    waveSharpness:mix(0.12,0.75,h),specularScatter:mix(0.15,1.8,r),
    roughness:0.30,specularStrength:0.60,specularSharpness:32,
    lightDirectionX:-0.32,lightDirectionY:altitude,lightDirectionZ:-1,
    reflectionStrength:mix(0.8,1.15,g),microNormalStrength:mix(0.003,0.015,r),
    microNormalSpeed:0.31,microNormalScale:6,
    opacity:mix(0.75,0.18,macro.clarity),bottomVisibility:macro.clarity,
    depthTint:mix(1.6,0.65,macro.clarity),depthVariationStrength:0.38,
    shallowColor:'#'+new THREE.Color(macro.color).lerp(new THREE.Color('#e0e6e8'),0.35).getHexString(),
    deepColor:'#'+new THREE.Color(macro.color).multiplyScalar(0.48).getHexString(),
    bottomTint:'#'+new THREE.Color(macro.color).lerp(new THREE.Color('#bac5c8'),0.35).getHexString(),
  });
  for(const [group,values] of Object.entries(overrides)) Object.assign(s[group],values);
  return s;
}
