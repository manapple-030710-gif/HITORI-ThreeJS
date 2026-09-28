// Animation core: do not edit for appearance changes. See AGENTS.md.
export function createWaterAnimation(getSpeed) {
  const timeUniform = { value: 0 };
  let paused = false;
  let previous = null;
  let elapsed = 0;
  let frame = 0;
  return {
    timeUniform,
    get time() { return timeUniform.value; },
    get paused() { return paused; },
    resetClock() { previous = null; },
    toggle() { paused = !paused; previous = null; },
    tick(now, visible) {
      const frameDelta = previous === null ? 0 : Math.max((now - previous) / 1000, 0);
      previous = now;
      const playing = !paused && visible;
      const delta = playing ? Math.min(frameDelta, 0.05) : 0;
      elapsed += delta;
      timeUniform.value += delta * getSpeed();
      frame += 1;
      return { frameDelta, playing, delta, elapsed, frame };
    },
  };
}
