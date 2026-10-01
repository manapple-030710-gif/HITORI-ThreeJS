// カメラはプリセット選択・数値入力時だけ更新します。
export const cameraPresets = {
  close: { fov: 42, position: [0, 2.6, 7], target: [0, 0.3, -24] },
  wide: { fov: 55, position: [0, 5, 38], target: [0, 1, -70] },
};
export const defaults = {
  frame: { width: 1920, height: 1080 },
  rendering: { exposure: 1.0, environmentIntensity: 1.0 },
  camera: { preset: 'close', ...structuredClone(cameraPresets.close) },
  sky: { zenith: '#dce0df', horizon: '#f0f0ec', time: 12 },
  lighting: { intensity: 1.0, direction: [-0.45, 0.65, -0.6] },
  // 弱い不規則なうねりと、近景で見える中小波を重ねます。
  // amplitudeはワールド単位、wavelengthは基準波長。speedは既存UIでも変更可能。
  water: {
  color: '#d8e0e2',
  colorCorrection: 'none',
  speed: 0.7,
  strength: 0.75,
  roughness: 0.30,
  // 材質のみ。opacityは近景の不透明度、depthTintは浅い吸収の強さ。
  opacity: 0.35,
  fresnelStrength: 1.05,
  reflectionStrength: 0.92,
  depthTint: 0.75,
  // 水面専用の自然光方向。空・霧の既存光方向から独立させます。
  specularStrength: 0.22,
  specularSharpness: 48,
  lightDirectionX: -0.15,
  lightDirectionY: 0.30,
  lightDirectionZ: -0.95,
  microNormalStrength: 0.005,
  microNormalScale: 5,
  microNormalSpeed: 0.18,
  shallowColor: '#dfe6e7',
  deepColor: '#b5c3cd',
  depthVariationStrength: 0.18,
  depthVariationScale: 0.06,
  highlightVariation: 0.18,
  highlightVariationScale: 0.13,
  causticStrength: 0.025,
  causticScale: 0.45,
  causticSpeed: 0.12,
  bottomVisibility: 1.0,
  bottomTint: '#dce3e5',
  bottomVariationStrength: 0.30,
  bottomVariationScale: 0.12,
  depthFadeStrength: 1.0,
  amplitude: 0.09,
  wavelength: 12,
  // 運動形状専用。既存wavelengthは水底側の参照値として維持。
  largeWaveStrength: 0.7,
  largeWaveScale: 8,
  largeWaveSpeed: 0.8,
  mediumWaveStrength: 1.2,
  mediumWaveScale: 2.4,
  mediumWaveSpeed: 1,
  smallWaveStrength: 0.8,
  smallWaveScale: 0.65,
  smallWaveSpeed: 0.85,
  waveDirectionSpread: 1,
  waveSpeedVariation: 0.8,
  waveSharpness: 0.35,
  specularScatter: 0.8
},
  // start: ワールド単位の開始距離、density: 距離あたりの濃さ（0で無効）、color: sRGB色。
  // horizonBlendWidth: 水平線から水面側へなじませる視角（度）。0で境界ブレンドなし。
  fog: { start: 25, density: 0.003, color: '#f0f0ec', horizonBlendWidth: 0.35 },
};
// 時刻は空・光・霧へ適用。雲は未実装、水面反射の空色は時刻に連動しません。
export const settings = structuredClone(defaults);
