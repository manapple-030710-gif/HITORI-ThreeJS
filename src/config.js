// カメラはプリセット選択・数値入力時だけ更新します。
export const cameraPresets = {
  close: { fov: 42, position: [0, 2.6, 7], target: [0, 0.3, -24] },
  wide: { fov: 55, position: [0, 5, 38], target: [0, 1, -70] },
};
export const defaults = {
  frame: { width: 1920, height: 1080 },
  camera: { preset: 'close', ...structuredClone(cameraPresets.close) },
  sky: { zenith: '#dce0df', horizon: '#f0f0ec', time: 12 },
  lighting: { intensity: 1.0, direction: [-0.45, 0.65, -0.6] },
  // 弱い不規則なうねりと、近景で見える中小波を重ねます。
  // amplitudeはワールド単位、wavelengthは基準波長。speedは既存UIでも変更可能。
  water: {
  color: '#cdd1cd',
  colorCorrection: 'none',
  speed: 0.7,
  strength: 0.75,
  roughness: 0.34,
  amplitude: 0.09,
  wavelength: 12
},
  // start: ワールド単位の開始距離、density: 距離あたりの濃さ（0で無効）、color: sRGB色。
  // horizonBlendWidth: 水平線から水面側へなじませる視角（度）。0で境界ブレンドなし。
  fog: { start: 25, density: 0.003, color: '#f0f0ec', horizonBlendWidth: 0.35 },
};
// 時刻は空・光・霧へ適用。雲は未実装、水面反射の空色は時刻に連動しません。
export const settings = structuredClone(defaults);
