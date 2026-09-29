import * as THREE from 'three';

// 水面の反射にも同じ空の関数を使い、空と水の色調を揃えます。
export const skyGLSL = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uLightDirection;
uniform float uLightIntensity;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uEnvironmentZenith;
uniform vec3 uEnvironmentHorizon;
uniform vec3 uEnvironmentFog;
uniform vec3 uEnvironmentLight;
uniform float uEnvironmentIntensity;
vec3 sampleSky(vec3 direction, vec3 zenith, vec3 horizon, vec3 fogColor, vec3 lightColor, float intensity) {
  float height = pow(clamp(direction.y, 0.0, 1.0), 0.55);
  vec3 color = mix(horizon, zenith, height);
  // A narrow horizon haze keeps the sky and distant water in the same fog color.
  // Only the low sky is affected; zero density restores the original sky.
  float horizonHaze = (1.0-exp(-max(uFogDensity,0.0)*16000.0))
    * exp(-max(direction.y,0.0)*70.0);
  color = mix(color,fogColor,horizonHaze);
  float alignment = max(dot(direction, uLightDirection), 0.0);
  // Broad overcast daylight, shared with the water's rough reflection.
  float softLight = pow(alignment, 5.0) * 0.10 + pow(alignment, 32.0) * 0.055;
  return (color + lightColor * softLight) * intensity;
}
// 水面反射は従来の色・光量・霧色を使い、時刻には連動させません。
vec3 skyColor(vec3 direction) {
  return sampleSky(direction, uZenith, uHorizon, uFogColor, vec3(1.0, 0.99, 0.96), uLightIntensity);
}
// 表示する空と、水面にかかる距離霧で同じ地平線を使います。
vec3 timeSkyColor(vec3 direction) {
  return sampleSky(direction, uEnvironmentZenith, uEnvironmentHorizon, uEnvironmentFog, uEnvironmentLight, uEnvironmentIntensity);
}
`;

// UIの色調整を基準に、時間帯の色を線形RGBで補間します。
const baseColors = {
  zenith: new THREE.Color('#dce0df'), horizon: new THREE.Color('#f0f0ec'),
  fog: new THREE.Color('#f0f0ec'),
};
// 朝は淡い青灰、昼は最も明るく、夕方は藤灰、夜は穏やかな青灰。
// 全区間で地平線を上空より明るくし、24時と0時は同じ色にします。
const timeColors = [
  // hour, zenith, horizon, fog, light, intensity
  [0, '#35435f', '#68778e', '#68778e', '#c2d3ec', 0.38],
  [6, '#cbdbe5', '#eee5df', '#eee5df', '#fff0df', 0.88],
  [12, '#dce7ee', '#f0f0ec', '#f0f0ec', '#fffdf7', 1.0],
  [18, '#a6abc4', '#c8c4d4', '#c8c4d4', '#e3deed', 0.72],
  [24, '#35435f', '#68778e', '#68778e', '#c2d3ec', 0.38],
].map(([hour, zenith, horizon, fog, light, intensity]) => ({
  hour, zenith: new THREE.Color(zenith), horizon: new THREE.Color(horizon),
  fog: new THREE.Color(fog), light: new THREE.Color(light), intensity,
}));

export function applySkyTime(sky, settings) {
  const hour = THREE.MathUtils.clamp(settings.sky.time, 0, 24);
  const end = timeColors.findIndex((color, index) => index > 0 && hour <= color.hour);
  const from = timeColors[end - 1];
  const to = timeColors[end];
  const t = THREE.MathUtils.smoothstep(hour, from.hour, to.hour);
  for (const [key, uniform] of [['zenith', 'uEnvironmentZenith'], ['horizon', 'uEnvironmentHorizon'], ['fog', 'uEnvironmentFog']]) {
    const color = sky.material.uniforms[uniform].value;
    // Linear RGBで補間。既存の空色ピッカーによる調整も維持します。
    color.copy(from[key]).lerp(to[key], t).sub(baseColors[key]);
    color.add(new THREE.Color(key === 'fog' ? settings.fog.color : settings.sky[key]));
    color.setRGB(
      THREE.MathUtils.clamp(color.r, 0, 1),
      THREE.MathUtils.clamp(color.g, 0, 1),
      THREE.MathUtils.clamp(color.b, 0, 1),
    );
  }
  sky.material.uniforms.uEnvironmentLight.value.copy(from.light).lerp(to.light, t);
  sky.material.uniforms.uEnvironmentIntensity.value =
    THREE.MathUtils.lerp(from.intensity, to.intensity, t) * settings.lighting.intensity;
}

export function createSky(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uSkyImage: { value: null },
      uSkyImageEnabled: { value: false },
      uSkyImageAspect: { value: 1 },
      uSkyFrameAspect: { value: 16 / 9 },
      uSkyPresetEnabled: { value: false },
      uSkyPresetZenith: { value: new THREE.Color() },
      uSkyPresetHorizon: { value: new THREE.Color() },
    }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDirection;
      varying vec4 vClip;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vClip = gl_Position; }`,
    fragmentShader: `${skyGLSL}
      varying vec3 vDirection;
      varying vec4 vClip;
      uniform sampler2D uSkyImage;
      uniform bool uSkyImageEnabled;
      uniform float uSkyImageAspect;
      uniform float uSkyFrameAspect;
      uniform bool uSkyPresetEnabled;
      uniform vec3 uSkyPresetZenith;
      uniform vec3 uSkyPresetHorizon;
      void main() {
        vec3 direction = normalize(vDirection);
        vec3 color = timeSkyColor(direction);
        if (uSkyPresetEnabled) {
          float height = pow(clamp(direction.y, 0.0, 1.0), 0.55);
          color = mix(uSkyPresetHorizon, uSkyPresetZenith, height);
        }
        if (uSkyImageEnabled) {
          // 通常の画像を画面に合わせて中央トリミング。水面には適用しません。
          vec2 uv = vClip.xy / vClip.w * 0.5 + 0.5;
          vec2 crop = vec2(min(uSkyFrameAspect / uSkyImageAspect, 1.0), min(uSkyImageAspect / uSkyFrameAspect, 1.0));
          vec4 texel = texture2D(uSkyImage, (uv - 0.5) * crop + 0.5);
          color = mix(color, texel.rgb, texel.a);
        }
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), material);
  mesh.name = 'Overcast sky';
  return mesh;
}

export function setSkyImage(sky, texture, frameAspect) {
  const uniforms = sky.material.uniforms;
  const previous = uniforms.uSkyImage.value;
  uniforms.uSkyImage.value = texture;
  uniforms.uSkyImageEnabled.value = Boolean(texture);
  uniforms.uSkyFrameAspect.value = frameAspect;
  if (texture) uniforms.uSkyImageAspect.value = texture.image.width / texture.image.height;
  if (previous && previous !== texture) previous.dispose();
}

export function setSkyPreset(sky, name) {
  const hour = { Morning: 6, Overcast: 12, Evening: 18, Night: 0 }[name];
  const palette = timeColors.find(entry => entry.hour === hour);
  const uniforms = sky.material.uniforms;
  uniforms.uSkyPresetEnabled.value = Boolean(palette);
  if (palette) {
    uniforms.uSkyPresetZenith.value.copy(palette.zenith);
    uniforms.uSkyPresetHorizon.value.copy(palette.horizon);
  }
}
