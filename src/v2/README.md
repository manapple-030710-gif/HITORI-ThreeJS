# HITORI Simulator V2

Default entry: `/` or `?sim=v2`. Original runtime: `?sim=v1`.
Only `src/entry.js` chooses the runtime. V1 source, defaults, renderer, GUI
and animation controller are retained. Navigation reloads the runtime;
temporary GUI edits and uploaded images are not carried between versions.

## Rendering boundary

V2 owns `environment.js`, `water.js`, `sky.js`, `spectrum.js`, `vertex.js`.
These start from the V1 implementation, but are separate files so V2 shader
changes cannot change V1. The shared animation controller owns the persistent
time uniform; macro edits do not replace that object or reset playback.

`config.js` maps macro values to internal settings. Advanced controls override
the derived settings. Any macro edit clears the overrides, as noted in the UI.
The image upload is independent and stays selected across macro edits.

## Four depth layers

- Near (roughly 0–35 units): transmitted bed color, medium waves, small normals,
  micro detail and directional highlights.
- Middle (35–150): integrated normals and broad reflected cloud/light zones.
- Far (150–1200): large/medium spectrum tapers according to Grandeur; quiet
  reflection remains while static distance haze grows.
- Horizon/sky: horizon haze, two projected cloud decks and a directional light
  zone. The same sky function shades procedural water reflection.

## Water backend

Finite-spectrum approximation, not FFT: 3 large + 7 medium displaced components,
9 small normal components, plus existing micro detail. Analytic derivatives,
seeded independent directions, unequal frequency-dependent phase speed, phase
bending and a small harmonic shape the surface. Pixel footprint and distance
filter the short wavelengths. Displacement is softly bounded below 0.5 units,
keeping it above the provisional bed at -0.65.

Randomness changes direction spread, wavelength distribution, phase offsets,
speed variance, local envelope, medium/small ratio and specular scatter.
Grandeur changes wavelengths, layer balance, distance envelopes and rough
reflection sampling width. Wave Height also drives sharpness and small-wave
response. Water Speed advances the persistent clock, preserving layer ratios.

A future FFT backend can replace `displacedSpectrum` / `spectrumBand`, maintaining
height and slope output and `vWorld` / `vSwellSlope`. No FFT work is included here.

## Sky images / buildings

PNG/JPG/WebP backgrounds retain screen-cover projection; they are not treated as
equirectangular environment maps. Image colors can drive fog/water/light via
the existing trimmed horizontal-band sampler. Procedural sky reflections are
an approximation, not image reflections or ray tracing.

Add future models to the scene's `ArchitectureRoot` group in `main.js`.
Environment lights are already present. Standard model materials will need a
matching fog/tone-mapping setup; V2 haze currently lives in the water shader.
No geometry or architecture is added to this group in this pass.

## Verification

`node --test tests/v2.test.mjs` and `npm run build`.
Advanced / Debug → 表示診断を更新 reports frame interval, triangles and draw calls.
Frame interval is not a GPU timer. Both versions use 1920×1080, pixel ratio 1.
