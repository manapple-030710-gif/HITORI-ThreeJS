# HITORI water animation stability

- Appearance tasks must not modify `src/animation/water-animation.js` or `src/animation/water-vertex.js`. Change these only when the user explicitly requests animation-core work.
- Preserve the existing RAF loop and visibility handling in `src/main.js` during appearance tasks. UI controls delegate playback to the animation controller.
- The controller owns the persistent `timeUniform`. Material creation must use that same object; appearance application must never replace/reset it or update playback state.
- Adjust colors, reflection, fog and surface shading in `src/environment/water.js` / `sky.js`; adjust amplitude, wavelength and speed through `src/config.js`. A zero speed or amplitude intentionally suppresses its corresponding motion; do not use zero unintentionally.
- Keep the subdivided geometry and vertex/fragment varyings (`vWorld`, `vSwellSlope`) compatible. Do not replace the surface with a four-vertex plane.
- No per-frame `material.needsUpdate`; only uniform values change. Preserve pause/resume continuity.
