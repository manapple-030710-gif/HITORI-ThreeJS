import * as THREE from 'three';
import { defaults, settings, cameraPresets } from './config.js';
import { createEnvironment } from './environment/index.js';
import './style.css';
import { createWaterAnimation } from './animation/water-animation.js';
import { readSkyPixels, sampleSkyColors } from './environment/sky-image-colors.js';

const stage = document.querySelector('#stage');
const error = document.querySelector('#error');
try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(settings.frame.width, settings.frame.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.camera.fov, 16 / 9, 0.1, 20000);
  camera.position.fromArray(settings.camera.position);
  camera.lookAt(new THREE.Vector3().fromArray(settings.camera.target));
  const cameraPreset = document.querySelector('#camera-preset');
  const cameraCustom = document.querySelector('#camera-custom');
  const cameraStatus = document.querySelector('#camera-input-status');
  const cameraFields = ['camera-x', 'camera-y', 'camera-z', 'look-at-x', 'look-at-y', 'look-at-z', 'camera-fov']
    .map(id => document.getElementById(id));
  let customCamera = structuredClone(settings.camera);
  function applyCamera() {
    camera.position.fromArray(settings.camera.position);
    camera.lookAt(new THREE.Vector3().fromArray(settings.camera.target));
    camera.fov = settings.camera.fov;
    camera.updateProjectionMatrix();
  }
  function syncCameraUI() {
    cameraPreset.value = settings.camera.preset;
    cameraCustom.hidden = settings.camera.preset !== 'custom';
    const values = [...settings.camera.position, ...settings.camera.target, settings.camera.fov];
    cameraFields.forEach((input, index) => { input.value = values[index]; });
    cameraStatus.textContent = '';
  }
  cameraPreset.addEventListener('change', () => {
    const preset = cameraPreset.value;
    Object.assign(settings.camera, structuredClone(preset === 'custom' ? customCamera : cameraPresets[preset]), { preset });
    applyCamera();
    syncCameraUI();
    if (preset === 'custom') cameraCustom.closest('details').open = true;
  });
  for (const input of cameraFields) {
    input.addEventListener('input', () => {
      if (settings.camera.preset !== 'custom') return;
      if (cameraFields.some(field => !Number.isFinite(field.valueAsNumber) || !field.validity.valid)) {
        cameraStatus.textContent = '入力欄の範囲内で数値を指定してください。';
        return;
      }
      const values = cameraFields.map(field => field.valueAsNumber);
      const position = values.slice(0, 3), target = values.slice(3, 6);
      if (new THREE.Vector3(...position).distanceToSquared(new THREE.Vector3(...target)) < 0.000001) {
        cameraStatus.textContent = 'カメラ位置と注視点は別の位置にしてください。';
        return;
      }
      Object.assign(settings.camera, { position, target, fov: values[6] });
      customCamera = structuredClone(settings.camera);
      cameraStatus.textContent = '';
      applyCamera();
    });
  }
  syncCameraUI();
  const animation = createWaterAnimation(() => settings.water.speed);
  const environment = createEnvironment(scene, settings, animation.timeUniform);
  let animationId;
  // 一時診断。波の速度・振幅・シェーダーには変更を加えません。
  const diagnostics = document.createElement('pre');
  diagnostics.id = 'animation-diagnostics';
  diagnostics.setAttribute('aria-label', 'アニメーション診断');
  document.body.appendChild(diagnostics);
  function draw(now) {
    const { frameDelta, playing, delta, elapsed, frame } = animation.tick(now, !document.hidden);
    renderer.render(scene, camera);
    // マテリアルの実際のuniformを読み戻す。ELAPSEDは速度適用前の秒数。
    diagnostics.textContent = `TIME     ${animation.time.toFixed(6)}\nFRAME    ${frame}\nPLAYING  ${playing}\nDELTA    ${delta.toFixed(6)} s\nELAPSED  ${elapsed.toFixed(6)} s\nRAF Δ    ${frameDelta.toFixed(6)} s\nVISIBLE  ${!document.hidden}\nSPEED    ${settings.water.speed.toFixed(2)}`;
    animationId = requestAnimationFrame(draw);
  }
  // 停止中も描画ループは継続。非表示・再開の時間を波へ加算しません。
  document.addEventListener('visibilitychange', () => animation.resetClock());
  animationId = requestAnimationFrame(draw);
  const bindings = [
    ['light', settings.lighting, 'intensity', 2],
    ['speed', settings.water, 'speed', 2],
    ['waves', settings.water, 'strength', 2],
    ['fog-start', settings.fog, 'start', 0],
    ['fog-density', settings.fog, 'density', 4],
    ['horizon-blend', settings.fog, 'horizonBlendWidth', 2],
  ];
  const timeSlider = document.querySelector('#sky-time');
  const timeOutput = document.querySelector('#sky-time-value');
  const skyPreset = document.querySelector('#sky-preset');
  const skyImageInput = document.querySelector('#sky-image');
  const skyImageStatus = document.querySelector('#sky-image-status');
  const skyColorInput = document.querySelector('#sky-color');
  const waterCorrection = document.querySelector('#water-color-correction');
  waterCorrection.addEventListener('change', () => {
    settings.water.colorCorrection = waterCorrection.value;
    sync();
  });
  const autoLink = document.querySelector('#sky-auto-link');
  const sampleSlider = document.querySelector('#sky-sample');
  const sampleOutput = document.querySelector('#sky-sample-value');
  let skyPixels = null;
  function updateImageColors() {
    sampleOutput.value = `${sampleSlider.value}%`;
    sampleSlider.setAttribute('aria-valuetext', sampleOutput.value);
    environment.setImageColors(autoLink.checked && skyPixels
      ? sampleSkyColors(skyPixels, Number(sampleSlider.value) / 100) : null);
  }
  autoLink.addEventListener('change', updateImageColors);
  sampleSlider.addEventListener('input', updateImageColors);
  let imageRequest = 0;
  function clearSkyImage() {
    imageRequest++;
    environment.setSkyImage(null);
    skyColorInput.disabled = false;
    skyColorInput.title = '';
    skyPixels = null;
    updateImageColors();
    skyImageInput.value = '';
    skyImageStatus.textContent = 'PNG / JPG / WebP';
  }
  function useCustomSky() {
    clearSkyImage();
    skyPreset.value = 'Custom';
    environment.setSkyPreset('Custom');
  }
  skyPreset.addEventListener('change', () => {
    clearSkyImage();
    environment.setSkyPreset(skyPreset.value);
  });
  document.querySelector('#choose-sky-image').onclick = () => skyImageInput.click();
  skyImageInput.addEventListener('change', async () => {
    const file = skyImageInput.files[0];
    if (!file) return;
    const request = ++imageRequest;
    skyImageInput.value = '';
    if (!/\.(png|jpe?g|webp)$/i.test(file.name) ||
        (file.type && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
      skyImageStatus.textContent = 'PNG / JPG / WebPを選択してください。';
      return;
    }
    const url = URL.createObjectURL(file);
    skyImageStatus.textContent = '画像を読み込み中…';
    try {
      const texture = await new THREE.TextureLoader().loadAsync(url);
      if (request !== imageRequest) { texture.dispose(); return; }
      if (Math.max(texture.image.width, texture.image.height) > renderer.capabilities.maxTextureSize) {
        texture.dispose();
        throw new Error('Image exceeds texture size limit');
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      environment.setSkyImage(texture);
      skyColorInput.disabled = true;
      skyColorInput.title = '空画像を使用中です。プリセットで画像を解除すると変更できます。';
      environment.setSkyPreset('Custom');
      skyPreset.value = 'Custom';
      skyImageStatus.textContent = file.name;
      // 解析に失敗しても、選択した画像の表示は維持します。
      try {
        skyPixels = readSkyPixels(texture.image);
        if (!sampleSkyColors(skyPixels, Number(sampleSlider.value) / 100)) {
          skyImageStatus.textContent = `${file.name} — サンプル帯が透明なため自動連動できません。`;
        }
      } catch {
        skyPixels = null;
        skyImageStatus.textContent = `${file.name} — 色を取得できないため手動設定を使用します。`;
      }
      updateImageColors();
    } catch {
      if (request === imageRequest) skyImageStatus.textContent = '画像を読み込めませんでした。別の画像、または縮小した画像を選択してください。';
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  function syncTime() {
    const minutes = Math.round(settings.sky.time * 60);
    const text = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    timeSlider.value = settings.sky.time;
    timeSlider.setAttribute('aria-valuetext', text);
    timeOutput.value = text;
  }
  timeSlider.addEventListener('input', event => {
    useCustomSky();
    settings.sky.time = Number(event.target.value);
    syncTime();
    environment.applyTime();
  });
  function sync() {
    syncTime();
    waterCorrection.value = settings.water.colorCorrection;
    for (const [id, object, key, precision] of bindings) {
      document.getElementById(id).value = object[key];
      document.getElementById(`${id}-value`).value = object[key].toFixed(precision) + (id === 'horizon-blend' ? '°' : '');
    }
    document.querySelector('#sky-color').value = settings.sky.zenith;
    document.querySelector('#fog-color').value = settings.fog.color;
    environment.apply();
  }
  for (const [id, object, key] of bindings) {
    document.getElementById(id).addEventListener('input', event => { object[key] = Number(event.target.value); sync(); });
  }
  skyColorInput.addEventListener('input', event => {
    if (skyColorInput.disabled) return;
    useCustomSky(); settings.sky.zenith = event.target.value; sync();
  });
  document.querySelector('#fog-color').addEventListener('input', event => { settings.fog.color = event.target.value; sync(); });
  document.querySelector('#reset').onclick = () => {
    Object.assign(settings.camera, structuredClone(defaults.camera));
    customCamera = structuredClone(defaults.camera);
    applyCamera();
    syncCameraUI();
    clearSkyImage();
    skyPreset.value = 'Overcast';
    environment.setSkyPreset('Overcast');
    autoLink.checked = false;
    sampleSlider.value = '55';
    updateImageColors();
    for (const key of ['sky', 'lighting', 'water', 'fog']) Object.assign(settings[key], structuredClone(defaults[key]));
    sync();
  };
  document.querySelector('#pause').onclick = event => {
    animation.toggle();
    event.target.textContent = animation.paused ? '再生' : '一時停止';
  };
  document.querySelector('#capture').onclick = () => {
    renderer.render(scene, camera);
    renderer.domElement.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'HITORI_1920x1080.png'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };
  document.querySelector('#fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { document.querySelector('#fullscreen').textContent = 'F11で全画面'; }
  };
  function toggleUI() {
    const hidden = !document.querySelector('#interface').hidden;
    document.querySelector('#interface').hidden = hidden;
    document.querySelector('#restore').hidden = !hidden;
    document.body.classList.toggle('clean', hidden);
  }
  document.querySelector('#hide').onclick = toggleUI;
  document.querySelector('#restore').onclick = toggleUI;
  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'h' && !event.repeat && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) toggleUI();
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); cancelAnimationFrame(animationId);
    error.hidden = false; error.textContent = '描画が中断されました。ページを再読み込みしてください。';
  });
  environment.setSkyPreset(skyPreset.value);
  sync();
} catch (cause) {
  error.hidden = false;
  error.textContent = '映像を起動できませんでした。Chrome / Edgeでハードウェア アクセラレーションを有効にして再読み込みしてください。';
  console.error(cause);
}
