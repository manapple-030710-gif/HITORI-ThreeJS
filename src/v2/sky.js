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

uniform float uCloudAmount;
float skyHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float skyNoise(vec2 p) {
 vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
 return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+1.0),f.x),f.y);
}
float cloudField(vec2 p) {
 return skyNoise(p)*0.58+skyNoise(p*2.07+13.7)*0.28+skyNoise(p*4.21-9.1)*0.14;
}
// One broad light opening shared by sky, water reflection and distant illumination.
float skyLightZone(vec3 d) {
 return pow(max(dot(normalize(d),uLightDirection),0.0),12.0);
}
vec3 sampleSky(vec3 direction, vec3 zenith, vec3 horizon, vec3 fogColor, vec3 lightColor, float intensity) {
 vec3 d=normalize(direction);
 float y=max(d.y,0.0);
 vec3 color=mix(horizon,zenith,pow(y,0.45));
 // Two elevated cloud decks, compressed toward a distant atmospheric horizon.
 vec2 lower=d.xz/(0.16+y)*1.8+vec2(6.2,9.7);
 vec2 upper=d.xz/(0.32+y)*3.1+vec2(-5.3,18.1);
 float deck=smoothstep(0.30,0.72,cloudField(lower));
 float veil=smoothstep(0.38,0.78,cloudField(upper));
 float visibility=smoothstep(0.005,0.11,y)*uCloudAmount;
 float alignment=max(dot(d,uLightDirection),0.0);
 float zone=skyLightZone(d);
 float opening=mix(1.0,0.35,deck*uCloudAmount);
 vec3 underside=mix(zenith*0.42,horizon*0.62,0.35);
 vec3 cloud=mix(underside,horizon*0.98+lightColor*zone*0.15,deck);
 color=mix(color,cloud,deck*visibility*0.85);
 color=mix(color,horizon*0.87,veil*visibility*0.24);
 color+=lightColor*opening*(pow(alignment,5.0)*0.06+zone*0.34+pow(alignment,80.0)*0.18);
 float haze=exp(-y*35.0);
 return mix(color,fogColor,haze*0.78)*intensity;
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
  const u=sky.material.uniforms;
  const daylight=THREE.MathUtils.smoothstep(Math.sin((settings.sky.time-6)/12*Math.PI),-0.2,0.35);
  u.uEnvironmentZenith.value.set('#26364e').lerp(new THREE.Color(settings.sky.zenith),daylight);
  u.uEnvironmentHorizon.value.set('#65788d').lerp(new THREE.Color(settings.sky.horizon),daylight);
  u.uEnvironmentFog.value.set('#65788d').lerp(new THREE.Color(settings.fog.color),daylight);
  u.uEnvironmentLight.value.set('#c4d4eb').lerp(new THREE.Color('#fff3e0'),daylight*0.8);
  u.uEnvironmentIntensity.value=THREE.MathUtils.lerp(0.42,1,daylight)*settings.lighting.intensity;
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
