// 調整値の入口。カメラは起動時のみ設定し、毎フレーム動かしません。
export const defaults = {
  frame: { width: 1920, height: 1080 },
  camera: { fov: 42, position: [0, 3.2, 12], target: [0, 1.7, -50] },
  sky: { zenith: '#dce0df', horizon: '#f0f0ec' },
  lighting: { intensity: 1.0, direction: [-0.45, 0.65, -0.6] },
  // 浅い水の平面。大きな起伏を抑え、細かな表面変化を主体にします。
  // amplitudeはワールド単位、wavelengthは基準波長。speedは既存UIでも変更可能。
  water: {
  color: '#cdd1cd',
  speed: 0.7,
  strength: 0.75,
  roughness: 0.34,
  amplitude: 0.07,
  wavelength: 5
},
  // start: ワールド単位の開始距離、density: 距離あたりの濃さ（0で無効）、color: sRGB色。
  fog: { start: 25, density: 0.003, color: '#f0f0ec' },
};
// 雲・時間帯は未実装。薄い距離霧は水面シェーダーで空の水平線色へ合成します。
export const settings = structuredClone(defaults);

