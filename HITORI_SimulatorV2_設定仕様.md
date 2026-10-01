# HITORI Simulator V2 設定仕様

調査日: 2026-09-30。対象は現在の `src/v2/` 実装。コードコメントや過去の要望より、実際の呼び出しと数式を優先する。本書作成による実装・数値変更はない。

## 集計と読み方

- 操作可能な設定: **65項目**（通常UI **15**、Advanced / Debug **50**）。ファイル選択を1設定として含む。ボタン、折りたたみ、バージョンリンク、状態表示は設定数に含めず、操作一覧に別記する。
- Advancedは水の数値39、水の色3、霧4、環境光1、空画像・連動・採取位置3。Debug専用の数値スライダーはない。表示診断はボタン。
- 「初期値」は起動時に `deriveSettings({scene:'HITORI Grandeur',...presets['HITORI Grandeur']})` を適用した設定値。従って現行HITORI Grandeur基準値と一致する。共有 `src/config.js.defaults` の未適用値やMaterialコンストラクタの一時値とは異なる。保存済みPresetによる自動起動復元はない。
- 数値表記は15有効桁まで丸める。厳密なIEEE 754値は末尾の基準JSONを参照。UIのoutputはstepから桁数を計算して丸め、range inputはブラウザによるstep補正があり得るが、起動時のsettingsをstepへ量子化する処理はない。
- 最小/最大/stepはUIレンジ。「—」は色・選択・真偽・ファイル等で数値概念なし。Presetのみの設定は後述の読み込み検証レンジ。色の明暗増減は色選択に依存し、数値スライダーのような単調変化とは記載しない。
- V2のカメラは `cameraAdjust` が実体。`deriveSettings().camera` はV1由来の残存値で実カメラに使用せず、Export対象にもならない。

## 設定の適用・連動の共通仕様

1. 通常マクロ（Camera Preset以外）を操作すると `overrides={}` にして全設定を再算出する。Advanced全上書きが解除される。
2. Camera Preset/自由カメラ操作では水・空等の上書きは保持。位置変更で注視点は自動追従しない。
3. Advanced操作は `overrides[group][key]` を代入し、`sync()` がsettings、uniform、UIを更新する。マクロ表示値を逆算して変更しない。
4. 再計算は永続timeUniformを維持。通常の設定操作は再生状態・水面の位相時刻をリセットしない（空の時刻はSky Preset/Scene Presetで変更される）。Preset Importは保存されたtime/pausedを明示復元する。
5. 画像自動連動は設定値自体への代入ではなくuniform側の補正。Exportは基礎settingsと画像・連動フラグを保存し、Importで補正を再計算する。
6. 数値の水色はsRGB表記、Three.js Colorの混合・乗算は線形RGB。反射は空関数のサンプリングであり、読み込んだ画像の直接鏡面反射ではない。

## 操作可能な設定の全項目

### 通常UI

#### N01 Scene Preset

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Scene Preset | `macro.scene` | Scene | 通常UI | string (enum) | — | — | — | `"HITORI Grandeur"` | `"HITORI Grandeur"` |

- **見た目への影響:** 選択プリセットのマクロ一式を代入し、カメラを再計算し、Advanced上書きを解除する。
- **上げた場合:** 選択式。大小なし。
- **下げた場合:** 選択式。大小なし。
- **他パラメータとの連動:** 空画像、画像連動ON/OFF、サンプル位置、再生時間・停止状態はこの処理でリセットしない。
- **使用ファイル / 関数:** src/v2/main.js: add(); src/v2/config.js: presets
- **Presetキー:** `world.macro.scene`

#### N02 Camera Preset

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Camera Preset | `macro.camera` | Camera | 通常UI | string (enum) | — | — | — | `"Grandeur"` | `"Grandeur"` |

- **見た目への影響:** Grandeur / Close / Wideで位置・FOV・注視点を再設定する。
- **上げた場合:** 選択式。大小なし。
- **下げた場合:** 選択式。大小なし。
- **他パラメータとの連動:** macro.framingを利用。他のAdvanced上書きは維持。
- **使用ファイル / 関数:** src/v2/main.js: presetCamera(), resetCameraControls(), applyCamera(); src/v2/preset-json.js: cameraForMacro()
- **Presetキー:** `shot.cameraPreset`

#### N03 左右 / Camera X

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| 左右 / Camera X | `cameraAdjust.x` | Camera | 通常UI | number | -100 | 100 | 0.1 | `0` | `0` |

- **見た目への影響:** カメラ位置Xのみ変更。注視点は固定。
- **上げた場合:** +X側へ移動。
- **下げた場合:** −X側へ移動。
- **他パラメータとの連動:** Camera Preset/Scene Preset/リセットで再設定。自由調整でプリセット名をCustomへ変更する処理はない。
- **使用ファイル / 関数:** src/v2/main.js: cameraFields, applyCamera()
- **Presetキー:** `shot.camera.x`

#### N04 高さ / Camera Height

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| 高さ / Camera Height | `cameraAdjust.height` | Camera | 通常UI | number | 0.6 | 40 | 0.1 | `5.5` | `5.5` |

- **見た目への影響:** カメラ位置Yのみ変更。注視点は固定。
- **上げた場合:** 高くなる。
- **下げた場合:** 低くなる。
- **他パラメータとの連動:** Camera Preset/Scene Preset/リセットで再設定。自由調整でプリセット名をCustomへ変更する処理はない。
- **使用ファイル / 関数:** src/v2/main.js: cameraFields, applyCamera()
- **Presetキー:** `shot.camera.height`

#### N05 前後 / Camera Z

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| 前後 / Camera Z | `cameraAdjust.distance` | Camera | 通常UI | number | -40 | 200 | 0.1 | `15` | `15` |

- **見た目への影響:** カメラ位置Zのみ変更。注視点からの距離そのものではない。
- **上げた場合:** +Z側へ移動。
- **下げた場合:** −Z側へ移動。
- **他パラメータとの連動:** Camera Preset/Scene Preset/リセットで再設定。自由調整でプリセット名をCustomへ変更する処理はない。
- **使用ファイル / 関数:** src/v2/main.js: cameraFields, applyCamera()
- **Presetキー:** `shot.camera.distance`

#### N06 FOV

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| FOV | `cameraAdjust.fov` | Camera | 通常UI | number | 20 | 90 | 1 | `54` | `54` |

- **見た目への影響:** PerspectiveCameraの垂直FOV（度）。
- **上げた場合:** 画角が広がる。
- **下げた場合:** 画角が狭まる。
- **他パラメータとの連動:** Camera Preset/Scene Preset/リセットで再設定。自由調整でプリセット名をCustomへ変更する処理はない。
- **使用ファイル / 関数:** src/v2/main.js: cameraFields, applyCamera()
- **Presetキー:** `shot.camera.fov`

#### N07 Sky Preset

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Sky Preset | `macro.sky` | Sky | 通常UI | string (enum) | — | — | — | `"Silver Break"` | `"Silver Break"` |

- **見た目への影響:** skyPresetsの上空色・地平線色・雲量・露出係数・霧係数を適用。
- **上げた場合:** 選択式。大小なし。
- **下げた場合:** 選択式。大小なし。
- **他パラメータとの連動:** 操作時はMorning=7、Evening=18、Night=0、それ以外=14へ時刻を設定。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: add(); src/v2/config.js: skyPresets, deriveSettings(); src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone()
- **Presetキー:** `world.macro.sky`

#### N08 Time / Light

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Time / Light | `macro.time` | Sky / Light | 通常UI | number | 0 | 24 | 0.05 | `15` | `15` |

- **見た目への影響:** sin((time−6)/12×π)をsmoothstep(−0.2,0.35)で昼光係数に変換。空・霧・光色と光量、光方向Yへ反映。時計の自動進行はない。
- **上げた場合:** 時刻が進む。明るさは単調増加しない。
- **下げた場合:** 時刻が戻る。明るさは単調減少しない。
- **他パラメータとの連動:** 光方向Y=0.08+0.22×max(0,sin(...))。水のlightDirectionYにも代入。画像連動時の光色は画像色が優先。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone(); src/v2/config.js: deriveSettings()
- **Presetキー:** `world.macro.time; world.settings.sky.time`

#### N09 Water Color

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Water Color | `macro.color` | Water | 通常UI | string (#RRGGBB) | — | — | — | `"#a5bbc4"` | `"#a5bbc4"` |

- **見た目への影響:** 水の基準色を設定。shallowColor、deepColor、bottomTintも線形RGBで派生。
- **上げた場合:** 色選択。大小なし。
- **下げた場合:** 色選択。大小なし。
- **他パラメータとの連動:** 浅色は#e0e6e8へ35%混合、深色は線形RGBを0.48倍、底色は#bac5c8へ35%混合。画像連動の薄い補正あり。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.macro.color; world.settings.water.color`

#### N10 Wave Height

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Wave Height | `macro.height` | Water | 通常UI | number | 0 | 1 | 0.01 | `0.56` | `0.56` |

- **見た目への影響:** strength、large/medium/smallWaveStrength、waveSharpnessを同時に変更。
- **上げた場合:** 振幅係数、波面勾配、形状の2次成分が増える。
- **下げた場合:** 係数を減らす。0でも派生値は0ではなく完全な静止にはならない。
- **他パラメータとの連動:** largeはGrandeur、medium/smallはRandomnessにも依存。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.macro.height`

#### N11 Water Speed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Water Speed | `macro.speed` | Water | 通常UI | number | 0 | 2 | 0.01 | `0.65` | `0.65` |

- **見た目への影響:** 永続uTimeの進行倍率。各波層の速度比は維持。
- **上げた場合:** 全uTime依存表現が速くなる。
- **下げた場合:** 遅くなる。0で時間進行停止。
- **他パラメータとの連動:** Advanced water.speedも同じsettings.water.speed。通常UIの表示値とAdvanced実効値は異なり得る。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/animation/water-animation.js: createWaterAnimation()/tick()
- **Presetキー:** `world.macro.speed; world.settings.water.speed`

#### N12 Randomness

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Randomness | `macro.randomness` | Water | 通常UI | number | 0 | 1 | 0.01 | `0.72` | `0.72` |

- **見た目への影響:** 波長分布幅、位相オフセット、局所振幅と方向・速度分散、medium/small強度、specularScatter、microNormalStrengthを変更。
- **上げた場合:** 分布と局所差の係数が増える。
- **下げた場合:** 分布と局所差の係数が減る。0でもシードと位相曲げは残る。
- **他パラメータとの連動:** world.randomnessとしてshaderへ送るほか、deriveSettingsで複数水パラメータへ写像。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main; src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.macro.randomness; world.settings.world.randomness`

#### N13 Water Scale / Grandeur

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Water Scale / Grandeur | `macro.grandeur` | Water / World | 通常UI | number | 0 | 1 | 0.01 | `0.82` | `0.82` |

- **見た目への影響:** 各波層の基準波長、large比率、霧開始距離、波の距離減衰、反射サンプル幅・強度へ連動。
- **上げた場合:** 波長と距離減衰の到達距離が増加。霧開始距離が遠くなり、反射サンプル幅係数は減少。
- **下げた場合:** 短波長・短い到達距離。霧開始が近くなる。
- **他パラメータとの連動:** uGrandeur: reach=lerp(0.7,3,g)、反射spread係数=lerp(2.7,1.5,g)。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main; src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.macro.grandeur; world.settings.world.grandeur`

#### N14 Clarity / Transparency

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Clarity / Transparency | `macro.clarity` | Water | 通常UI | number | 0 | 1 | 0.01 | `0.55` | `0.55` |

- **見た目への影響:** opacity=lerp(0.75,0.18,c)、bottomVisibility=c、depthTint=lerp(1.6,0.65,c)。
- **上げた場合:** 近景の底面透過を増やし、吸収係数を減らす。
- **下げた場合:** 底面透過を減らし、吸収係数を増やす。
- **他パラメータとの連動:** 反射量・距離霧・depthFadeStrengthでも底面透過を抑制。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.macro.clarity`

#### N15 Exposure

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| Exposure | `macro.exposure` | Image | 通常UI | number | 0.3 | 1.8 | 0.01 | `1` | `1` |

- **見た目への影響:** ACESのrenderer.toneMappingExposureに渡すマクロ値。
- **上げた場合:** 露出倍率が増える。
- **下げた場合:** 露出倍率が減る。
- **他パラメータとの連動:** 実効露出=macro.exposure×skyPresets[sky].exposure（上書きなしの場合）。初期UIは1、実効は1.02。Advanced上書きを解除。
- **使用ファイル / 関数:** src/v2/config.js: deriveSettings(); src/v2/main.js: sync()
- **Presetキー:** `shot.exposure.macro; shot.exposure.effective`

### Advanced / Debug

#### A01 largeWaveStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| largeWaveStrength | `settings.water.largeWaveStrength` | Water | Advanced / Debug | number | 0 | 3 | 0.01 | `0.6586944` | `0.6586944` |

- **見た目への影響:** 大波3成分の高さ・勾配係数。
- **上げた場合:** 大波寄与が増す。
- **下げた場合:** 減る。0で大波寄与なし。
- **他パラメータとの連動:** strength、amplitude、largeWaveScale、Grandeur。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.largeWaveStrength; world.advanced.water.largeWaveStrength（上書き時）`

#### A02 largeWaveScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| largeWaveScale | `settings.water.largeWaveScale` | Water | Advanced / Debug | number | 3 | 30 | 0.1 | `18.76` | `18.76` |

- **見た目への影響:** 大波の基準波長（ワールド座標）。
- **上げた場合:** 波長が長くなる。物理式の位相速度や距離減衰も変わる。
- **下げた場合:** 波長が短くなる。
- **他パラメータとの連動:** Randomnessで波長分布、Grandeurで到達距離。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.largeWaveScale; world.advanced.water.largeWaveScale（上書き時）`

#### A03 largeWaveSpeed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| largeWaveSpeed | `settings.water.largeWaveSpeed` | Water | Advanced / Debug | number | 0 | 3 | 0.01 | `0.48` | `0.48` |

- **見た目への影響:** 大波の局所時間倍率。
- **上げた場合:** 大波の位相進行が速くなる。
- **下げた場合:** 遅くなる。0でも初期形状は残る。
- **他パラメータとの連動:** 全体water.speed、waveSpeedVariation、波数。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.largeWaveSpeed; world.advanced.water.largeWaveSpeed（上書き時）`

#### A04 mediumWaveStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| mediumWaveStrength | `settings.water.mediumWaveStrength` | Water | Advanced / Debug | number | 0 | 4 | 0.01 | `1.91292` | `1.91292` |

- **見た目への影響:** 中波7成分の高さ・解析勾配係数。
- **上げた場合:** 中波変位と法線への寄与増加。
- **下げた場合:** 減る。0で中波寄与なし。
- **他パラメータとの連動:** strength、amplitude、mediumWaveScale。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.mediumWaveStrength; world.advanced.water.mediumWaveStrength（上書き時）`

#### A05 mediumWaveScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| mediumWaveScale | `settings.water.mediumWaveScale` | Water | Advanced / Debug | number | 0.8 | 8 | 0.1 | `3.642` | `3.642` |

- **見た目への影響:** 中波の基準波長。
- **上げた場合:** 長波長になる。
- **下げた場合:** 短波長になる。
- **他パラメータとの連動:** Randomness、Grandeur、波数に応じた位相速度。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.mediumWaveScale; world.advanced.water.mediumWaveScale（上書き時）`

#### A06 mediumWaveSpeed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| mediumWaveSpeed | `settings.water.mediumWaveSpeed` | Water | Advanced / Debug | number | 0 | 4 | 0.01 | `0.83` | `0.83` |

- **見た目への影響:** 中波の局所時間倍率。
- **上げた場合:** 中波位相が速くなる。
- **下げた場合:** 遅くなる。0でこの層の時間項停止。
- **他パラメータとの連動:** 全体speed、waveSpeedVariation。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.mediumWaveSpeed; world.advanced.water.mediumWaveSpeed（上書き時）`

#### A07 smallWaveStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| smallWaveStrength | `settings.water.smallWaveStrength` | Water | Advanced / Debug | number | 0 | 4 | 0.01 | `1.990776` | `1.990776` |

- **見た目への影響:** 小波9成分の法線勾配係数。頂点変位には使わない。
- **上げた場合:** 近景の小波勾配と遠景の未解像粗さ寄与が増す。
- **下げた場合:** 減る。0で小波勾配と未解像粗さ寄与なし。
- **他パラメータとの連動:** smallFade（12〜95）、strength、specularScatter。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.smallWaveStrength; world.advanced.water.smallWaveStrength（上書き時）`

#### A08 smallWaveScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| smallWaveScale | `settings.water.smallWaveScale` | Water | Advanced / Debug | number | 0.15 | 2 | 0.01 | `0.7402` | `0.7402` |

- **見た目への影響:** 小波の基準波長。
- **上げた場合:** 波長が長くなる。勾配へのscale乗算と距離・画素減衰も変化。
- **下げた場合:** 波長が短くなる。
- **他パラメータとの連動:** smallWaveStrength、Grandeur、ピクセル占有面積。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.smallWaveScale; world.advanced.water.smallWaveScale（上書き時）`

#### A09 smallWaveSpeed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| smallWaveSpeed | `settings.water.smallWaveSpeed` | Water | Advanced / Debug | number | 0 | 4 | 0.01 | `1.23` | `1.23` |

- **見た目への影響:** 小波法線の局所時間倍率。
- **上げた場合:** 小波位相が速くなる。
- **下げた場合:** 遅くなる。0でこの層の時間項停止。
- **他パラメータとの連動:** water.speed、waveSpeedVariation。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main; src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.smallWaveSpeed; world.advanced.water.smallWaveSpeed（上書き時）`

#### A10 waveDirectionSpread

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| waveDirectionSpread | `settings.water.waveDirectionSpread` | Water | Advanced / Debug | number | 0 | 2 | 0.01 | `1.366` | `1.366` |

- **見た目への影響:** 角度=0.34+(seed×2π−π)×値。
- **上げた場合:** シード方向の分散倍率が増す。
- **下げた場合:** 減る。0で全層方向が0.34radに揃う（位相曲げは残る）。
- **他パラメータとの連動:** Randomnessマクロが初期値を算出。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.waveDirectionSpread; world.advanced.water.waveDirectionSpread（上書き時）`

#### A11 waveSpeedVariation

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| waveSpeedVariation | `settings.water.waveSpeedVariation` | Water | Advanced / Debug | number | 0 | 2 | 0.01 | `1.396` | `1.396` |

- **見た目への影響:** rate=2^((seed−0.5)×値×1.3)。
- **上げた場合:** 波ごとの局所速度比の分散が増す。
- **下げた場合:** 0でrate=1（層速度・波数差は残る）。
- **他パラメータとの連動:** 各層speed、全体water.speed。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.waveSpeedVariation; world.advanced.water.waveSpeedVariation（上書き時）`

#### A12 waveSharpness

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| waveSharpness | `settings.water.waveSharpness` | Water | Advanced / Debug | number | 0 | 1 | 0.01 | `0.4728` | `0.4728` |

- **見た目への影響:** sin位相に−0.26×値×cos(2位相)を混合し正規化。
- **上げた場合:** 2次高調波の寄与と解析勾配が変化。
- **下げた場合:** 0で形状の2次高調波なし。
- **他パラメータとの連動:** 画素減衰にも(1+値)を使用。変位は0.5未満へ軟制限。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main
- **Presetキー:** `world.settings.water.waveSharpness; world.advanced.water.waveSharpness（上書き時）`

#### A13 specularScatter

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| specularScatter | `settings.water.specularScatter` | Water | Advanced / Debug | number | 0 | 2 | 0.01 | `1.338` | `1.338` |

- **見た目への影響:** スペキュラ用勾配にsmallSlope×(値−1)を加える。
- **上げた場合:** 小波由来のスペキュラ法線の寄与が増す。
- **下げた場合:** 小波寄与が減る。0ではその成分を取り除く。
- **他パラメータとの連動:** smallFade、smallWaveStrength、specularStrength。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.specularScatter; world.advanced.water.specularScatter（上書き時）`

#### A14 bottomVisibility

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| bottomVisibility | `settings.water.bottomVisibility` | Water | Advanced / Debug | number | 0 | 1 | 0.01 | `0.55` | `0.55` |

- **見た目への影響:** 近景の底面透過係数と底面表示ゲート。
- **上げた場合:** 透過係数が増加。
- **下げた場合:** 0で底面透過なし、底面ゲートもオフ。
- **他パラメータとの連動:** (1−opacity)(1−reflectionWeight)(1−fogAmount)と距離減衰の積。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.water.bottomVisibility; world.advanced.water.bottomVisibility（上書き時）`

#### A15 bottomVariationStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| bottomVariationStrength | `settings.water.bottomVariationStrength` | Water | Advanced / Debug | number | 0 | 0.6 | 0.01 | `0.3` | `0.3` |

- **見た目への影響:** 底面の浅色・深色のノイズ混合率。
- **上げた場合:** 底面色の局所差が強くなる。
- **下げた場合:** 0でこの局所色差なし（弱いshimmerは別）。
- **他パラメータとの連動:** bottomTint、bottomVariationScale、距離減衰。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.water.bottomVariationStrength; world.advanced.water.bottomVariationStrength（上書き時）`

#### A16 bottomVariationScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| bottomVariationScale | `settings.water.bottomVariationScale` | Water | Advanced / Debug | number | 0.03 | 0.4 | 0.01 | `0.12` | `0.12` |

- **見た目への影響:** 底面ノイズの空間周波数。波長パラメータではない。
- **上げた場合:** 模様の空間サイズが小さくなる。
- **下げた場合:** 大きくなる。
- **他パラメータとの連動:** bottomVariationStrength、uTime、strengthによるoffset。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.water.bottomVariationScale; world.advanced.water.bottomVariationScale（上書き時）`

#### A17 depthFadeStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| depthFadeStrength | `settings.water.depthFadeStrength` | Water | Advanced / Debug | number | 0.75 | 2.5 | 0.01 | `1` | `1` |

- **見た目への影響:** 底面・透過の距離に掛ける倍率。
- **上げた場合:** 近い距離で底面が消える。
- **下げた場合:** より遠くまで底面が残る。
- **他パラメータとの連動:** 底面65〜110、水面透過18〜60のsmoothstep。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.water.depthFadeStrength; world.advanced.water.depthFadeStrength（上書き時）`

#### A18 depthVariationStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| depthVariationStrength | `settings.water.depthVariationStrength` | Water | Advanced / Debug | number | 0 | 0.5 | 0.01 | `0.38` | `0.38` |

- **見た目への影響:** 水中基準色をshallow/deep色へ混合する強度。
- **上げた場合:** 浅深色の寄与が増す。
- **下げた場合:** 0でこの色差なし。
- **他パラメータとの連動:** shallowColor、deepColor、depthVariationScale、15〜160距離減衰。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.depthVariationStrength; world.advanced.water.depthVariationStrength（上書き時）`

#### A19 depthVariationScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| depthVariationScale | `settings.water.depthVariationScale` | Water | Advanced / Debug | number | 0.02 | 0.3 | 0.01 | `0.06` | `0.06` |

- **見た目への影響:** 静止した仮想深度ノイズの空間周波数。
- **上げた場合:** 色差の空間サイズが小さくなり、画素減衰も早まる。
- **下げた場合:** 大きな色差領域になる。
- **他パラメータとの連動:** depthVariationStrength、footprint。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.depthVariationScale; world.advanced.water.depthVariationScale（上書き時）`

#### A20 highlightVariation

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| highlightVariation | `settings.water.highlightVariation` | Water | Advanced / Debug | number | 0 | 0.5 | 0.01 | `0.18` | `0.18` |

- **見た目への影響:** specularを1+(mask−0.5)×値×fadeで乗算。
- **上げた場合:** 局所明暗差が増す。最大でも倍率0.75〜1.25。
- **下げた場合:** 0でこの局所乗算なし。
- **他パラメータとの連動:** specularStrengthが0なら影響なし、30〜180距離減衰。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.highlightVariation; world.advanced.water.highlightVariation（上書き時）`

#### A21 highlightVariationScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| highlightVariationScale | `settings.water.highlightVariationScale` | Water | Advanced / Debug | number | 0.03 | 0.5 | 0.01 | `0.13` | `0.13` |

- **見た目への影響:** ハイライト用静止ノイズの空間周波数。
- **上げた場合:** ムラのサイズが小さくなる。画素減衰も変化。
- **下げた場合:** 大きなムラになる。
- **他パラメータとの連動:** highlightVariation、footprint。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.highlightVariationScale; world.advanced.water.highlightVariationScale（上書き時）`

#### A22 causticStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| causticStrength | `settings.water.causticStrength` | Water | Advanced / Debug | number | 0 | 0.12 | 0.001 | `0.025` | `0.025` |

- **見た目への影響:** 水中bed色の微弱な明度揺らぎ乗算。実コースティクスではない。
- **上げた場合:** 揺らぎの明暗幅が増す。
- **下げた場合:** 0でこの乗算なし。
- **他パラメータとの連動:** causticScale/Speed、8〜65距離減衰、別描画の水底shimmerとは独立。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.causticStrength; world.advanced.water.causticStrength（上書き時）`

#### A23 causticScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| causticScale | `settings.water.causticScale` | Water | Advanced / Debug | number | 0.1 | 1.5 | 0.01 | `0.45` | `0.45` |

- **見た目への影響:** 水中明度ドリフトの空間周波数。
- **上げた場合:** 細かくなり、画素減衰も変化。
- **下げた場合:** 大きな揺らぎになる。
- **他パラメータとの連動:** causticStrength、causticSpeed、footprint。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.causticScale; world.advanced.water.causticScale（上書き時）`

#### A24 causticSpeed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| causticSpeed | `settings.water.causticSpeed` | Water | Advanced / Debug | number | 0 | 0.5 | 0.01 | `0.12` | `0.12` |

- **見た目への影響:** 水中明度ノイズの移動速度係数。
- **上げた場合:** 移動が速くなる。
- **下げた場合:** 0でこのノイズの時間移動なし。
- **他パラメータとの連動:** 全体water.speed、causticStrength。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.causticSpeed; world.advanced.water.causticSpeed（上書き時）`

#### A25 specularStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| specularStrength | `settings.water.specularStrength` | Water | Advanced / Debug | number | 0 | 1 | 0.01 | `0.6` | `0.6` |

- **見た目への影響:** 法線・視線・光方向・Fresnelを使った方向性ハイライトの乗算強度。
- **上げた場合:** ハイライト加算量が増す。
- **下げた場合:** 0でこのハイライトなし。
- **他パラメータとの連動:** sharpness、roughness、lightDirectionXYZ、scatter、variation、距離減衰。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.specularStrength; world.advanced.water.specularStrength（上書き時）`

#### A26 specularSharpness

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| specularSharpness | `settings.water.specularSharpness` | Water | Advanced / Debug | number | 8 | 160 | 1 | `32` | `32` |

- **見た目への影響:** ローブ指数の基準。実効指数=lerp(値,8,roughness²)。
- **上げた場合:** 反射ローブが狭くなる。全面的な明るさ増加ではない。
- **下げた場合:** 広くなる。
- **他パラメータとの連動:** roughness、遠景のbroadLobe、光・視線方向。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.specularSharpness; world.advanced.water.specularSharpness（上書き時）`

#### A27 lightDirectionX

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| lightDirectionX | `settings.water.lightDirectionX` | Light / Water | Advanced / Debug | number | -1 | 1 | 0.01 | `-0.32` | `-0.32` |

- **見た目への影響:** 水の方向性specular用方向ベクトルのX成分。
- **上げた場合:** 正方向成分へ変更。明るさの単調変化ではない。
- **下げた場合:** 負方向成分へ変更。
- **他パラメータとの連動:** XYZをまとめて正規化。ゼロベクトルでspecularなし。空用lighting.directionとは別キー。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/environment.js: apply()
- **Presetキー:** `world.settings.water.lightDirectionX; world.advanced.water.lightDirectionX（上書き時）`

#### A28 lightDirectionY

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| lightDirectionY | `settings.water.lightDirectionY` | Light / Water | Advanced / Debug | number | -1 | 1 | 0.01 | `0.23556349186104` | `0.23556349186104` |

- **見た目への影響:** 水の方向性specular用方向ベクトルのY成分。
- **上げた場合:** 正方向成分へ変更。明るさの単調変化ではない。
- **下げた場合:** 負方向成分へ変更。
- **他パラメータとの連動:** XYZをまとめて正規化。ゼロベクトルでspecularなし。空用lighting.directionとは別キー。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/environment.js: apply()
- **Presetキー:** `world.settings.water.lightDirectionY; world.advanced.water.lightDirectionY（上書き時）`

#### A29 lightDirectionZ

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| lightDirectionZ | `settings.water.lightDirectionZ` | Light / Water | Advanced / Debug | number | -1 | 1 | 0.01 | `-1` | `-1` |

- **見た目への影響:** 水の方向性specular用方向ベクトルのZ成分。
- **上げた場合:** 正方向成分へ変更。明るさの単調変化ではない。
- **下げた場合:** 負方向成分へ変更。
- **他パラメータとの連動:** XYZをまとめて正規化。ゼロベクトルでspecularなし。空用lighting.directionとは別キー。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/environment.js: apply()
- **Presetキー:** `world.settings.water.lightDirectionZ; world.advanced.water.lightDirectionZ（上書き時）`

#### A30 microNormalStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| microNormalStrength | `settings.water.microNormalStrength` | Water | Advanced / Debug | number | 0 | 0.025 | 0.001 | `0.01164` | `0.01164` |

- **見た目への影響:** 2層noiseGradientで表面法線だけを微摂動。
- **上げた場合:** 近景の微細勾配が増す。
- **下げた場合:** 0でこの追加法線なし。
- **他パラメータとの連動:** min(strength,1)、8〜55距離減衰、microNormalScaleの画素減衰。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.microNormalStrength; world.advanced.water.microNormalStrength（上書き時）`

#### A31 microNormalScale

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| microNormalScale | `settings.water.microNormalScale` | Water | Advanced / Debug | number | 1 | 12 | 0.1 | `6` | `6` |

- **見た目への影響:** 微細法線ノイズの空間周波数。
- **上げた場合:** 細かくなる。画素減衰も強くなる。
- **下げた場合:** 大きな微細表情になる。
- **他パラメータとの連動:** microNormalStrength、footprint、2層目周波数1.37倍。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.microNormalScale; world.advanced.water.microNormalScale（上書き時）`

#### A32 microNormalSpeed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| microNormalSpeed | `settings.water.microNormalSpeed` | Water | Advanced / Debug | number | 0 | 0.6 | 0.01 | `0.31` | `0.31` |

- **見た目への影響:** 微細法線ノイズの時間移動倍率。
- **上げた場合:** 移動が速くなる。
- **下げた場合:** 0で追加ノイズの時間移動なし。
- **他パラメータとの連動:** water.speed、microNormalStrength。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.microNormalSpeed; world.advanced.water.microNormalSpeed（上書き時）`

#### A33 opacity

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| opacity | `settings.water.opacity` | Water | Advanced / Debug | number | 0 | 1 | 0.01 | `0.4365` | `0.4365` |

- **見た目への影響:** 近景の底面透過式にある(1−opacity)。単独の全面alphaではない。
- **上げた場合:** 底面透過が減る。
- **下げた場合:** 底面透過が増える。
- **他パラメータとの連動:** bottomVisibility、反射・霧・距離、境界alpha。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.opacity; world.advanced.water.opacity（上書き時）`

#### A34 roughness

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| roughness | `settings.water.roughness` | Water | Advanced / Debug | number | 0.04 | 0.65 | 0.01 | `0.3` | `0.3` |

- **見た目への影響:** 空反射の5方向サンプル幅、Fresnel視線補正、スペキュラ指数に使用。
- **上げた場合:** サンプル幅が広がり、スペキュラ指数は8へ近づく。
- **下げた場合:** サンプル幅が狭まる。
- **他パラメータとの連動:** 未解像小波とbroadノイズも加算し0.04〜0.65にclamp。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.roughness; world.advanced.water.roughness（上書き時）`

#### A35 fresnelStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| fresnelStrength | `settings.water.fresnelStrength` | Water | Advanced / Debug | number | 0 | 1.5 | 0.01 | `1.05` | `1.05` |

- **見た目への影響:** IOR 1.333のFresnel反射率に掛ける倍率。
- **上げた場合:** 角度依存反射率が増加（上限あり）。
- **下げた場合:** 0でFresnel由来の反射Weightと方向specularが0。
- **他パラメータとの連動:** roughness、reflectionStrength、facetVisibility。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.fresnelStrength; world.advanced.water.fresnelStrength（上書き時）`

#### A36 reflectionStrength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| reflectionStrength | `settings.water.reflectionStrength` | Water | Advanced / Debug | number | 0 | 1.5 | 0.01 | `1.087` | `1.087` |

- **見た目への影響:** 反射Weightおよび遠景の広い光加算の倍率。
- **上げた場合:** 空反射と遠景光寄与が増す。
- **下げた場合:** 減る。0でも独立した方向specularは残り得る。
- **他パラメータとの連動:** Fresnel、roughness、EnvironmentGain、距離減衰。Weight上限0.94。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.reflectionStrength; world.advanced.water.reflectionStrength（上書き時）`

#### A37 depthTint

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| depthTint | `settings.water.depthTint` | Water | Advanced / Debug | number | 0 | 2 | 0.01 | `1.0775` | `1.0775` |

- **見た目への影響:** exp(−吸収係数×layerDepth×値/refractedCos)の吸収倍率。
- **上げた場合:** 透過成分が減り、吸収色の寄与が変化。
- **下げた場合:** 0でこの吸収による減衰なし。
- **他パラメータとの連動:** 水色、layerDepth、視線角、環境光。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.depthTint; world.advanced.water.depthTint（上書き時）`

#### A38 speed

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| speed | `settings.water.speed` | Water | Advanced / Debug | number | 0 | 2 | 0.01 | `0.65` | `0.65` |

- **見た目への影響:** settings.water.speed。永続uTimeの進行倍率。
- **上げた場合:** 波・微細法線・水底などuTime依存表現が速くなる。
- **下げた場合:** 0で時間進行停止。
- **他パラメータとの連動:** 通常Water Speedはmacro.speedを表示するため独立した表示値。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/animation/water-animation.js: createWaterAnimation()/tick()
- **Presetキー:** `world.settings.water.speed; world.advanced.water.speed（上書き時）`

#### A39 strength

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| strength | `settings.water.strength` | Water | Advanced / Debug | number | 0 | 2.5 | 0.01 | `0.9768` | `0.9768` |

- **見た目への影響:** 振幅換算、細波法線、micro法線、水中層、底面driftへ使用。
- **上げた場合:** 振幅gainと水面勾配が増す。一部はminで飽和。
- **下げた場合:** 0で波の振幅・小波勾配・micro法線・底面driftなし。causticは別。
- **他パラメータとの連動:** uAmplitude=amplitude×strength/0.75×(1+0.6×smoothstep(0.75,2.5,strength))。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/spectrum.js: spectrumBand(), displacedSpectrum(); src/v2/vertex.js: waterVertexShader main; src/v2/water.js: createWater() fragment main; src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.water.strength; world.advanced.water.strength（上書き時）`

#### A40 shallowColor

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| shallowColor | `settings.water.shallowColor` | Water | Advanced / Debug | string (#RRGGBB) | — | — | — | `"#bccbd2"` | `"#bccbd2"` |

- **見た目への影響:** 仮想浅深マスクの浅側色。
- **上げた場合:** 色選択。大小なし。
- **下げた場合:** 色選択。大小なし。
- **他パラメータとの連動:** deepColor、depthVariationStrength。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.shallowColor; world.advanced.water.shallowColor（上書き時）`

#### A41 deepColor

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| deepColor | `settings.water.deepColor` | Water | Advanced / Debug | string (#RRGGBB) | — | — | — | `"#76868d"` | `"#76868d"` |

- **見た目への影響:** 仮想浅深マスクの深側色。
- **上げた場合:** 色選択。大小なし。
- **下げた場合:** 色選択。大小なし。
- **他パラメータとの連動:** shallowColor、depthVariationStrength。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main
- **Presetキー:** `world.settings.water.deepColor; world.advanced.water.deepColor（上書き時）`

#### A42 bottomTint

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| bottomTint | `settings.water.bottomTint` | Water | Advanced / Debug | string (#RRGGBB) | — | — | — | `"#adbfc5"` | `"#adbfc5"` |

- **見た目への影響:** 実際の底面Planeの基準色。
- **上げた場合:** 色選択。大小なし。
- **下げた場合:** 色選択。大小なし。
- **他パラメータとの連動:** bottomVisibility、Variation、光色・光量。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.water.bottomTint; world.advanced.water.bottomTint（上書き時）`

#### A43 density

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| density | `settings.fog.density` | Fog | Advanced / Debug | number | 0 | 0.008 | 0.0001 | `0.00065` | `0.00065` |

- **見た目への影響:** fogAmount=1−exp(−fogDistance×max(density,0))。
- **上げた場合:** 遠景の地平線色への混合が増す。
- **下げた場合:** 0で距離霧混合なし。境界ブレンドは残る。
- **他パラメータとの連動:** start、horizonBlendWidth、空の地平線色、画像連動時のsoftFogDistance。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone()
- **Presetキー:** `world.settings.fog.density; world.advanced.fog.density（上書き時）`

#### A44 start

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| start | `settings.fog.start` | Fog | Advanced / Debug | number | 0 | 300 | 1 | `96.5` | `96.5` |

- **見た目への影響:** 距離霧を開始するカメラ距離（ワールド単位）。
- **上げた場合:** 霧開始が遠くなる。
- **下げた場合:** 近くなる。
- **他パラメータとの連動:** density。画像連動時は開始近辺を35単位で滑らかにする。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone()
- **Presetキー:** `world.settings.fog.start; world.advanced.fog.start（上書き時）`

#### A45 horizonBlendWidth

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| horizonBlendWidth | `settings.fog.horizonBlendWidth` | Fog | Advanced / Debug | number | 0 | 2 | 0.01 | `0.22` | `0.22` |

- **見た目への影響:** 地平線から水面側へ背景合成する視角幅（度）。
- **上げた場合:** 幅が広がる。
- **下げた場合:** 0で境界合成なし。
- **他パラメータとの連動:** 60以内の近景を保護、180まで有効化。densityとは独立。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone()
- **Presetキー:** `world.settings.fog.horizonBlendWidth; world.advanced.fog.horizonBlendWidth（上書き時）`

#### A46 color

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| color | `settings.fog.color` | Fog | Advanced / Debug | string (#RRGGBB) | — | — | — | `"#c4d1dc"` | `"#c4d1dc"` |

- **見た目への影響:** 時刻で夜色#65788dと補間される霧基準色。
- **上げた場合:** 色選択。大小なし。
- **下げた場合:** 色選択。大小なし。
- **他パラメータとの連動:** Time、画像連動、sampleSkyの地平線霞にも使用。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone()
- **Presetキー:** `world.settings.fog.color; world.advanced.fog.color（上書き時）`

#### A47 environmentIntensity

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| environmentIntensity | `settings.rendering.environmentIntensity` | Light / Rendering | Advanced / Debug | number | 0 | 1.5 | 0.01 | `1` | `1` |

- **見た目への影響:** 水の空反射・透過光・底面光、HemisphereLight強度の倍率。
- **上げた場合:** それらの寄与が増す。
- **下げた場合:** 0でそれらの乗算寄与なし。
- **他パラメータとの連動:** 空背景のtimeSkyColorと独立specular加算、DirectionalLight強度にはこの倍率を掛けない。ACES Exposureとは別。
- **使用ファイル / 関数:** src/v2/main.js: control(), add()/detail(), sync(); src/v2/config.js: deriveSettings(); src/v2/environment.js: createEnvironment()/apply()/applyTime(); src/v2/water.js: createWater() fragment main; src/v2/water.js: createWaterBed() fragment main
- **Presetキー:** `world.settings.rendering.environmentIntensity; world.advanced.rendering.environmentIntensity（上書き時）`

#### A48 空画像を選択

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| 空画像を選択 | `skyImageAsset / pixels` | Sky / Image | Advanced / Debug | file (PNG/JPG/WebP) | — | — | — | `null` | `null` |

- **見た目への影響:** 画像をsRGB Textureとして空へ画面中央cover表示し、128×128 Canvasで色解析。
- **上げた場合:** ファイル選択。大小なし。
- **下げた場合:** ファイル選択。大小なし。
- **他パラメータとの連動:** 画像自体を鏡面反射せず、ON時のみ採取色を補正に使用。
- **使用ファイル / 関数:** src/v2/main.js: #v2-image onchange, imageColors(); src/v2/sky.js: setSkyImage(); src/environment/sky-image-colors.js: readSkyPixels()
- **Presetキー:** `world.skyImage.dataUrl; world.skyImage.name`

#### A49 画像の色に自動連動

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| 画像の色に自動連動 | `DOM #v2-auto.checked` | Sky / Water / Fog / Light | Advanced / Debug | boolean | — | — | — | `true` | `true` |

- **見た目への影響:** ONかつ画像ありで上空/地平線採取色を霧・水・光へ反映。
- **上げた場合:** ON: 画像連動を有効化。
- **下げた場合:** OFF: 手動・時刻由来の環境色を使用。空画像は維持。
- **他パラメータとの連動:** 霧濃度・開始距離・境界幅・光の強さは変更しない。
- **使用ファイル / 関数:** src/v2/main.js: imageColors(); src/v2/environment.js: setImageColors(), applyTime(); src/environment/sky-image-colors.js: deriveSkyEnvironment()
- **Presetキー:** `world.skyImage.autoLink`

#### A50 地平線サンプル位置

| UI表示名 | 内部キー | カテゴリ | 配置 | 型 | 最小 | 最大 | step | 初期値 | HITORI Grandeur基準値 |
|---|---|---|---|---|---|---|---|---|---|
| 地平線サンプル位置 | `DOM #v2-sample.value` | Sky / Image | Advanced / Debug | number | 0.45 | 0.8 | 0.01 | `0.55` | `0.55` |

- **見た目への影響:** 画像上端0〜下端1の採取帯中心。中心±0.04の横帯を解析。
- **上げた場合:** より画像下側を採取。色変化の方向は画像依存。
- **下げた場合:** より上側を採取。
- **他パラメータとの連動:** ONかつ画像ありで再計算。上空の採取中心0.20は固定。輝度上下10%除外、alpha<0.1除外、線形RGBのalpha加重平均。
- **使用ファイル / 関数:** src/v2/main.js: imageColors(); src/environment/sky-image-colors.js: sampleSkyColors()
- **Presetキー:** `world.skyImage.sampleY`

## UI操作・Debug表示（設定65項目とは別集計）

| 表示名 / ID | 配置 | 型・レンジ・step・初期値 | 実装と動作 | Preset対象 |
|---|---|---|---|---|
| Export Preset JSON / v2-export-preset | 通常UI Scene直下 | button、数値なし | main.js: presetState(), exportPreset(); HITORI-V2-Preset.jsonを保存 | 全保存構造 |
| Import Preset JSON / v2-import-preset、v2-preset-file | 通常UI Scene直下 | button＋隠しJSON file input、初期未選択 | main.js: presetFile.onchange; 64×1024×1024 bytes以下。画像decode後に適用 | 全既知構造 |
| 空画像を解除 / v2-clear-image | Advanced | button、数値なし | clearImage(): 画像・pixelsを解除しsync。連動フラグ/採取位置を保持 | 画像dataUrl=null、name空へ |
| HITORI Grandeurに戻す / v2-reset | Advanced | button、数値なし | マクロ・自由カメラ・上書き・空画像をリセット。time/paused、autoLink/sampleYは保持 | リセット後の値 |
| 表示診断を更新 | Advanced / Debug | button、数値なし | Frame間隔の平滑平均、triangles、callsを表示。GPU実測時間ではない | 診断値は保存しない |
| 一時停止 / 再生 / pause | footer | action、初期paused=false | animation.toggle(): 時間進行の停止/再開。RAF描画は継続 | shot.animation.paused |
| PNG保存 / capture | footer | action、数値なし | UIを含まない1920×1080 PNG | 保存操作状態は対象外 |
| 全画面 / fullscreen | footer | action、初期通常画面 | Fullscreen APIを切替 | 対象外 |
| UIを隠す [H] / hide、UI復帰 / restore | footer / 復帰ボタン | action、初期UI表示 | toggleUI(); Hキー（入力中以外）で切替 | 対象外 |
| World controls、Advanced / Debug | パネル | details、初期World open / Advanced closed | 開閉はHTML状態 | 対象外 |
| Simulator V1 / V2 | 左上 | link | entry.js: sim=v1のみV1、それ以外V2。別runtimeへ遷移 | 遷移状態は対象外 |

## Scene / Sky / Cameraの選択値

### Scene Presetのマクロ基準

| Scene | Height | Speed | Randomness | Grandeur | Clarity | Sky | Time | Camera | framing（UIなし） | Water Color | Exposureマクロ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HITORI Grandeur | 0.56 | 0.65 | 0.72 | 0.82 | 0.55 | "Silver Break" | 15 | "Grandeur" | 0.5 | "#a5bbc4" | 1 |
| Calm Water | 0.18 | 0.35 | 0.32 | 0.2 | 0.85 | "Morning" | 7 | "Close" | 0.4 | "#b7c8cc" | 1 |
| Open Water | 0.75 | 0.8 | 0.9 | 1 | 0.3 | "Silver Break" | 14 | "Grandeur" | 0.65 | "#97afbd" | 1 |
| Deep Mist | 0.34 | 0.45 | 0.65 | 0.65 | 0.35 | "Overcast" | 10 | "Wide" | 0.5 | "#b4c2c8" | 1 |

### Sky Presetの内部係数（UI独立スライダーなし）

| Sky | zenith | horizon / fog基準 | clouds | exposure係数 | haze係数 | UI選択時のTime |
|---|---|---|---|---|---|---|
| Silver Break | #617c92 | #c4d1dc | 0.85 | 1.02 | 1 | 14 |
| Morning | #9ab4c8 | #e4dace | 0.55 | 1.03 | 0.85 | 7 |
| Overcast | #89959f | #cbd3d8 | 1 | 1.07 | 1.5 | 14 |
| Evening | #7e839c | #c1b8c8 | 0.65 | 1 | 0.9 | 18 |
| Night | #26364e | #65788d | 0.6 | 0.95 | 0.8 | 0 |

Sky UIはderiveSettings経由。sky.jsのsetSkyPreset()/timeColorsは現在のV2 GUIから呼ばれていないため、その06:00/12:00色表をV2の実効時間補間仕様として扱わない。実効補間はapplySkyTime()の昼光係数式。雲は静止したproceduralノイズで、Timeによる雲移動はない。

### Camera Preset

f=macro.framing。position/targetはワールド座標。

| 選択 | position | target | FOV | HITORI Grandeurのf=0.5での値 |
|---|---|---|---|---|
| Grandeur | [0,4+3f,8+14f] | [0,Y−3.8,Z−95] | 54° | position=[0,5.5,15], target=[0,1.7,−80] |
| Close | [0,2.5+2f,4+8f] | [0,Y−3.8,Z−95] | 46° | position=[0,3.5,8], target=[0,−0.3,−87] |
| Wide | [0,6+4f,18+16f] | [0,Y−3.8,Z−95] | 54° | position=[0,8,26], target=[0,4.2,−69] |

実効初期FOVは54°（PerspectiveCameraコンストラクタの52°は直後のsyncで置換）。Custom選択肢、独立Zoom、Look At GUIは現在のV2に存在しない。targetとframingはPresetから復元できる。

## UIなしで保存・復元可能な値

以下は65項目とは別。各項目の配置は「UIなし / Presetのみ」、stepは未定義。初期値=HITORI Grandeur基準値。

| 内部キー / Presetキー | 型 | Import最小〜最大 | 初期値 / 基準値 | 影響・増減・連動 | 使用ファイル / 関数 |
|---|---|---|---|---|---|
| `macro.framing / shot.framing` | number | 0〜1 | `0.5` | 上げるとプリセット位置Y/Zの式が増加。下げると減少。Camera Presetとセットで再計算。 | main.js: presetCamera(); preset-json.js: cameraForMacro() |
| `cameraAdjust.target / shot.camera.target` | number[3] | 各成分−20000〜20000 | `[0,1.7000000000000002,-80]` | 注視点。各成分の増減でその座標へ向く。位置と一致する場合はImportで現在のcameraを保持。 | main.js: applyCamera(); preset-json.js: importPreset() |
| `settings.sky.zenith / world.settings.sky.zenith` | string (#RRGGBB) | — | `"#617c92"` | 上空基準色。色選択依存。Timeの夜色との補間後に空と水反射へ使用。 | src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone() |
| `settings.sky.horizon / world.settings.sky.horizon` | string (#RRGGBB) | — | `"#c4d1dc"` | 地平線基準色。色選択依存。Timeの夜色との補間、空と水反射で使用。 | src/v2/sky.js: applySkyTime(), sampleSky(), timeSkyColor(), skyLightZone() |
| `settings.lighting.intensity / world.settings.lighting.intensity` | number | 0〜3 | `1` | 上げると時間連動のEnvironmentIntensityと光量が増加、下げると減少。EnvironmentGainとは別。 | environment.js: applyTime(); sky.js: applySkyTime() |
| `settings.lighting.direction / world.settings.lighting.direction` | number[3] | 各成分−1〜1 | `[-0.32,0.23556349186104047,-1]` | 正規化して空のlight zoneと水の空反射に使用。各成分の増減は方向変更。水specular用XYZとは独立。 | environment.js: apply(); sky.js: skyLightZone(), sampleSky() |
| `settings.world.clouds / world.settings.world.clouds` | number | 0〜1 | `0.85` | 上げると雲deck/veilと明るい切れ間の抑制係数が増す。下げると減る。0で雲の混合なし。 | environment.js: apply(); sky.js: sampleSky(); water.js: farCloud/farLight |
| `settings.water.amplitude / world.settings.water.amplitude` | number | 0〜0.5 | `0.09` | 大波・中波高さと勾配の基準倍率。上げると増す、0でその変位なし。strengthの換算後にshaderへ渡す。 | environment.js: apply(); spectrum.js: displacedSpectrum() |
| `settings.water.wavelength / world.settings.water.wavelength` | number | 2〜100 | `12` | 水底offsetの基準波長。上げると長い、下げると短い。V2 surface spectrumの波長には使わない。 | src/v2/water.js: createWaterBed() fragment main; environment.js: apply() |
| `settings.water.colorCorrection / world.settings.water.colorCorrection` | string enum | none / soften / white / gray / blue | `"none"` | softenは画像反映weightを半分（連動時）にし、最終水色を25%無彩色へ。white/gray/blueは8%固定色補正。選択式で大小なし。 | environment.js: applyTime(); water.js: correction |
| `animation.timeUniform.value / shot.animation.time` | number | 0〜1000000000 | `0` | 水・底面の位相時刻。起動時0、以後毎tick進む。上げ/下げは位相進退であり明るさの単調変化ではない。 | src/animation/water-animation.js: createWaterAnimation()/tick(); main.js: presetFile.onchange |

上記settings項目は`world.advanced.<group>.<key>`でも上書き指定できる。UIがある同名設定（water.color/speed、sky.time、world.randomness/grandeur、rendering.exposure等）もresolved snapshotとして保存される。skyImage.nameはファイル名（初期空文字、Import最大255文字）、dataUrlは埋め込み画像（初期null）で独立したスライダーではない。shot.animation.pausedはfooter停止操作で変更し、初期false。format/schemaVersionはメタデータでGUI項目ではない。

## マクロ写像の数式

L(a,b,x)=a+(b−a)x、h=height、r=randomness、g=grandeur、c=clarity。deriveSettings()は以下を算出してから最後にoverridesを適用する。

| 対象 | 式 |
|---|---|
| water.strength | L(0.12,1.65,h) |
| largeWaveStrength / Scale / Speed | L(0.12,0.9,h)×L(0.65,1.3,g) / L(4,22,g) / 0.48 |
| mediumWaveStrength / Scale / Speed | L(0.25,2.8,h)×L(0.6,1.35,r) / L(1.1,4.2,g) / 0.83 |
| smallWaveStrength / Scale / Speed | L(0.15,2.6,h)×L(0.3,1.7,r) / L(0.24,0.85,g) / 1.23 |
| waveDirectionSpread / waveSpeedVariation | L(0.25,1.8,r) / L(0.1,1.9,r) |
| waveSharpness / specularScatter | L(0.12,0.75,h) / L(0.15,1.8,r) |
| reflectionStrength / microNormalStrength | L(0.8,1.15,g) / L(0.003,0.015,r) |
| opacity / bottomVisibility / depthTint | L(0.75,0.18,c) / c / L(1.6,0.65,c) |
| fog.start / density / width | L(35,110,g) / (scene==Deep Mist?0.003:0.00065)×sky.haze / 0.22 |
| lighting.direction / water.lightDirectionXYZ | [−0.32,0.08+0.22×max(0,sin((time−6)/12×π)),−1] |
| rendering.exposure / environmentIntensity | macro.exposure×sky.exposure / 1 |

Randomnessのshader側は波長分布幅L(0.35,2.4,r)、位相オフセット係数L(0.6,9.73,r)、局所gain=1+0.3r×sin(localPhase)。Grandeurの距離reach=L(0.7,3,g)。large3成分＋medium7成分が頂点変位、小波9成分はfragment法線。FFTではない。

## 空画像連動の実際の補正値

使用箇所: `src/environment/sky-image-colors.js: deriveSkyEnvironment()`、`src/v2/environment.js: applyTime()`、`src/v2/water.js: imageDepthWeight()/waterSkyColor()/fragment main`。

- 採取画像は128×128へ縮小。地平線の中心±0.04、上空の0.20±0.04の横帯を各全幅から取得。透明度0.1未満と輝度の上下10%を除き、線形RGBのalpha加重平均を使う。画像が全透明等で平均を取得できない場合は自動色補正を使用しない。
- 霧候補色は地平線色から12%だけ灰方向へ混合（灰の輝度は地平線輝度+0.035、最大1）。`uEnvironmentFog`へ候補色を設定し、`uFogColor`は時刻由来の霧色から候補色へ18%混合する。
- 水候補色は上空色から地平線色へ65%混合し、基準水色へ12%反映。反射側の上空/地平線色は各18%反映。これらに水shaderの距離weight（距離12→90で0.15→0.45、90→450で0.45→0.8）を掛けて基準色と混合する。
- 光候補色は水候補色を最大RGB成分で正規化し、白へ14%混合する。光の色のみ変更し、設定のintensityは維持。
- 自動連動時の距離霧は遠方ほど`uEnvironmentFog`から採取した地平線色へ最大75%戻す。霧開始周辺の距離を35ワールド単位で滑らかに補正する。画像の直接環境マップ化はしない。
- 補正量は追加UIではなく固定係数。ON/OFFやサンプル位置操作でsettings自体は変えず再計算するため、色の補正が累積する構造ではない。

## Preset JSONの構造・優先順位・互換性

正式スキーマ: [HITORI_SimulatorV2_PresetSchema.json](HITORI_SimulatorV2_PresetSchema.json)。JSON Schema Draft 2020-12。これは現在の正規Export形式を定義する文書であり、runtimeでスキーマファイルを読み込んで検証する処理はない。

- `format='HITORI.SimulatorV2'`、`schemaVersion=1`。
- **world**: macro（camera/framing/exposureを除く）、settings（sky/water/fog/lighting/rendering/world）、advanced（overrides）、skyImage（dataUrl/name/autoLink/sampleY）。
- **shot**: cameraPreset、framing、camera（x/height/distance/fov/target）、exposure（macro/effective）、animation（time/paused）。
- Exportの`world.settings.rendering`からexposureを削除し、実効露出をshotへ保存する。既存overridesの`world.advanced.rendering.exposure`は削除しない。将来の分離時にはこの重複に注意。
- settingsのwater全46キー、sky3、fog4、lighting2、world3、rendering.environmentIntensity1を保存する（計59の設定キー。ベクトルは1キーとして数える）。frameと残存settings.cameraは保存しない。
- Restore: 現在状態を複製 → 有効なマクロを適用 → deriveSettings基準を生成 → advancedをsanitize → resolved settingsを優先 → shotの実効露出・実カメラ・再生状態 → 埋め込み画像をdecode → UIとrendererへ一括適用。画像色の補正は再算出。
- Unknownキーはwhitelistを通さない。欠落は原則現在値維持。ただしadvancedオブジェクトが明示されると上書き集合を置き換える。skyImageが明示されると未指定autoLink=true/sampleY=0.55/name空/dataUrl=nullで補完する。Camera Preset/framing変更でカメラ基準を再生成する。
- 無効型・非有限数値は無視して警告、レンジ外数値はclampして警告。stepの倍数制約はImportにない。
- 異なるschemaVersionは警告して既知項目を読む。formatが明示され不一致の場合は拒否。未来バージョンの完全復元を保証しない。
- 旧形式はroot macro / settings / overrides / cameraAdjust / camera、またはroot sky / water / fog / lighting / renderingを扱う。camera.position配列はx/height/distanceへ変換し各レンジにclamp。camera.targetは3要素各絶対値20000以内。その他の未確認旧形式の互換性は保証しない。
- 無効JSON、非objectルート、識別できる設定キーなし、形式違い、無効画像URL、画像decode失敗、64MiB超過は適用前に拒否し状態を維持する。画像はPNG/jpeg/WebP base64 data URLのみ（外部URL参照なし）。
- Worldのみ/Shotのみの部分オブジェクトは現行Importでも読み得るが、独立したWorld/ShotのExportボタン・別formatは未実装。スキーマの`$defs.worldPreset`/`$defs.shotPreset`で将来の分離へ参照可能。
- 保存しない状態: パネル開閉、UI表示、全画面、診断統計、選択inputのローカルファイルpath、architecture、カメラnear/far/aspect、renderer解像度・pixelRatio・toneMapping方式。これらは現在の固定実装を使用。

## 実効基準Presetの完全例

起動時刻time=0を捕捉した例。実際にボタンで保存するanimation.timeは保存時点の値。

```json
{
  "format": "HITORI.SimulatorV2",
  "schemaVersion": 1,
  "world": {
    "macro": {
      "scene": "HITORI Grandeur",
      "height": 0.56,
      "speed": 0.65,
      "randomness": 0.72,
      "grandeur": 0.82,
      "clarity": 0.55,
      "sky": "Silver Break",
      "time": 15,
      "color": "#a5bbc4"
    },
    "settings": {
      "sky": {
        "zenith": "#617c92",
        "horizon": "#c4d1dc",
        "time": 15
      },
      "water": {
        "color": "#a5bbc4",
        "colorCorrection": "none",
        "speed": 0.65,
        "strength": 0.9768,
        "roughness": 0.3,
        "opacity": 0.4365,
        "fresnelStrength": 1.05,
        "reflectionStrength": 1.087,
        "depthTint": 1.0775000000000001,
        "specularStrength": 0.6,
        "specularSharpness": 32,
        "lightDirectionX": -0.32,
        "lightDirectionY": 0.23556349186104047,
        "lightDirectionZ": -1,
        "microNormalStrength": 0.01164,
        "microNormalScale": 6,
        "microNormalSpeed": 0.31,
        "shallowColor": "#bccbd2",
        "deepColor": "#76868d",
        "depthVariationStrength": 0.38,
        "depthVariationScale": 0.06,
        "highlightVariation": 0.18,
        "highlightVariationScale": 0.13,
        "causticStrength": 0.025,
        "causticScale": 0.45,
        "causticSpeed": 0.12,
        "bottomVisibility": 0.55,
        "bottomTint": "#adbfc5",
        "bottomVariationStrength": 0.3,
        "bottomVariationScale": 0.12,
        "depthFadeStrength": 1,
        "amplitude": 0.09,
        "wavelength": 12,
        "largeWaveStrength": 0.6586944000000001,
        "largeWaveScale": 18.759999999999998,
        "largeWaveSpeed": 0.48,
        "mediumWaveStrength": 1.9129199999999997,
        "mediumWaveScale": 3.642,
        "mediumWaveSpeed": 0.83,
        "smallWaveStrength": 1.9907760000000003,
        "smallWaveScale": 0.7402,
        "smallWaveSpeed": 1.23,
        "waveDirectionSpread": 1.366,
        "waveSpeedVariation": 1.396,
        "waveSharpness": 0.47280000000000005,
        "specularScatter": 1.338
      },
      "fog": {
        "color": "#c4d1dc",
        "start": 96.49999999999999,
        "density": 0.00065,
        "horizonBlendWidth": 0.22
      },
      "lighting": {
        "intensity": 1,
        "direction": [
          -0.32,
          0.23556349186104047,
          -1
        ]
      },
      "rendering": {
        "environmentIntensity": 1
      },
      "world": {
        "randomness": 0.72,
        "grandeur": 0.82,
        "clouds": 0.85
      }
    },
    "advanced": {},
    "skyImage": {
      "dataUrl": null,
      "name": "",
      "autoLink": true,
      "sampleY": 0.55
    }
  },
  "shot": {
    "cameraPreset": "Grandeur",
    "framing": 0.5,
    "camera": {
      "x": 0,
      "height": 5.5,
      "distance": 15,
      "fov": 54,
      "target": [
        0,
        1.7000000000000002,
        -80
      ]
    },
    "exposure": {
      "macro": 1,
      "effective": 1.02
    },
    "animation": {
      "time": 0,
      "paused": false
    }
  }
}
```

## 今後の更新ルール

UI項目・ラベル・配置・型・レンジ・step・初期値、内部パラメータ・連動式・適用処理、Preset構造・Import互換処理を変更する場合は、**同じ変更で本書とHITORI_SimulatorV2_PresetSchema.jsonを必ず更新する**。src/v2/preset.schema.jsonも存在するため構造・制約の整合を保つ。

変更時はmain.js、advanced.js、config.js、environment.js、water.js、sky.js、spectrum.js、vertex.js、preset-json.js、共有defaultsと画像サンプラーを照合する。設定の数、V2実効初期値、World/Shot配置、旧形式の扱い、Export→Importの復元を再確認する。stepをJSON Schema multipleOfへ機械的に変換しない（現行派生値はstepに一致しない）。互換性を変える場合はschemaVersionと移行方針も更新する。追加機能を仕様だけで実装済みと扱わない。
