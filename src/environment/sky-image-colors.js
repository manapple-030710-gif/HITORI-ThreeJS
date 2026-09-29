import * as THREE from 'three';

const luminance = color => color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;

// 元画像の正規化座標を保持した小さな解析用Canvas。表示用画像は変更しません。
export function readSkyPixels(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function sampleSkyColors(pixels, sampleY = 0.55) {
  function band(center) {
    const samples = [];
    const start = Math.max(0, Math.floor((center - 0.04) * pixels.height));
    const end = Math.min(pixels.height, Math.ceil((center + 0.04) * pixels.height));
    for (let y = start; y < end; y++) {
      for (let x = 0; x < pixels.width; x++) {
        const offset = (y * pixels.width + x) * 4;
        const alpha = pixels.data[offset + 3] / 255;
        if (alpha < 0.1) continue;
        const color = new THREE.Color().setRGB(
          pixels.data[offset] / 255, pixels.data[offset + 1] / 255,
          pixels.data[offset + 2] / 255, THREE.SRGBColorSpace,
        );
        samples.push({ color, alpha, brightness: luminance(color) });
      }
    }
    if (!samples.length) return null;
    // 明暗の両端10%を除いた、透明度で重み付けした線形RGB平均。
    samples.sort((a, b) => a.brightness - b.brightness);
    const trim = Math.floor(samples.length * 0.1);
    const mean = new THREE.Color(0, 0, 0);
    let weight = 0;
    for (let i = trim; i < samples.length - trim; i++) {
      mean.add(samples[i].color.multiplyScalar(samples[i].alpha));
      weight += samples[i].alpha;
    }
    return mean.multiplyScalar(1 / weight);
  }
  const horizon = band(THREE.MathUtils.clamp(sampleY, 0.45, 0.80));
  const upper = band(0.20);
  return horizon && upper ? { horizon, upper } : null;
}

export function deriveSkyEnvironment(samples) {
  const gray = Math.min(1, luminance(samples.horizon) + 0.035);
  const fog = samples.horizon.clone().lerp(new THREE.Color(gray, gray, gray), 0.12);
  const water = samples.upper.clone().lerp(samples.horizon, 0.65);
  const tint = water.clone();
  const peak = Math.max(tint.r, tint.g, tint.b, 0.001);
  tint.multiplyScalar(1 / peak);
  // 白を主体に14%だけ色味を追加。光量はユーザー設定を維持。
  const light = new THREE.Color(1, 1, 1).lerp(tint, 0.14);
  return { fog, water, light };
}
