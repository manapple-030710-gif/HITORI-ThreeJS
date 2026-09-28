import * as THREE from 'three';
import { defaults, settings } from './config.js';
import { createEnvironment } from './environment/index.js';
import './style.css';
import { createWaterAnimation } from './animation/water-animation.js';

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
  ];
  function sync() {
    for (const [id, object, key, precision] of bindings) {
      document.getElementById(id).value = object[key];
      document.getElementById(`${id}-value`).value = object[key].toFixed(precision);
    }
    document.querySelector('#sky-color').value = settings.sky.zenith;
    document.querySelector('#fog-color').value = settings.fog.color;
    environment.apply();
  }
  for (const [id, object, key] of bindings) {
    document.getElementById(id).addEventListener('input', event => { object[key] = Number(event.target.value); sync(); });
  }
  document.querySelector('#sky-color').addEventListener('input', event => { settings.sky.zenith = event.target.value; sync(); });
  document.querySelector('#fog-color').addEventListener('input', event => { settings.fog.color = event.target.value; sync(); });
  document.querySelector('#reset').onclick = () => {
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
    if (event.key.toLowerCase() === 'h' && !event.repeat && !/INPUT|TEXTAREA/.test(event.target.tagName)) toggleUI();
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); cancelAnimationFrame(animationId);
    error.hidden = false; error.textContent = '描画が中断されました。ページを再読み込みしてください。';
  });
  sync();
} catch (cause) {
  error.hidden = false;
  error.textContent = '映像を起動できませんでした。Chrome / Edgeでハードウェア アクセラレーションを有効にして再読み込みしてください。';
  console.error(cause);
}


