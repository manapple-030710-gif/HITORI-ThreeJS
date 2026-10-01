import test from 'node:test';
import assert from 'node:assert/strict';
import { presets, deriveSettings } from '../src/v2/config.js';
import { defaults } from '../src/config.js';
import { createWaterAnimation } from '../src/animation/water-animation.js';

const base={scene:'HITORI Grandeur',...presets['HITORI Grandeur']};
test('all preset and macro extremes produce finite settings without touching V1',()=>{
  const before=JSON.stringify(defaults);
  for(const [scene,preset] of Object.entries(presets)){
    for(const edge of [0,1]){
      const s=deriveSettings({...preset,scene,height:edge,randomness:edge,grandeur:edge,clarity:edge});
      for(const [key,value] of Object.entries(s.water)) if(typeof value==='number') assert.ok(Number.isFinite(value),key);
      assert.ok(s.water.largeWaveScale>=3 && s.water.smallWaveScale>0);
      assert.notEqual(s.water.largeWaveSpeed,s.water.mediumWaveSpeed);
      assert.notEqual(s.water.mediumWaveSpeed,s.water.smallWaveSpeed);
      assert.ok(s.fog.density>0);
    }
  }
  assert.equal(JSON.stringify(defaults),before);
});
test('macro extremes change multiple independent responses substantially',()=>{
  const low=deriveSettings({...base,randomness:0}).water,high=deriveSettings({...base,randomness:1}).water;
  assert.ok(high.smallWaveStrength>low.smallWaveStrength*4);
  assert.ok(high.waveDirectionSpread>low.waveDirectionSpread*5);
  assert.ok(high.specularScatter>low.specularScatter*5);
  const quiet=deriveSettings({...base,height:0}).water,strong=deriveSettings({...base,height:1}).water;
  assert.ok(strong.mediumWaveStrength>quiet.mediumWaveStrength*8);
  assert.ok(strong.waveSharpness>quiet.waveSharpness*4);
  assert.ok(deriveSettings({...base,grandeur:1}).water.largeWaveScale>deriveSettings({...base,grandeur:0}).water.largeWaveScale*4);
});
test('zero speed, pause and hidden tabs preserve the same clock object',()=>{
  let speed=0.65;const animation=createWaterAnimation(()=>speed),uniform=animation.timeUniform;
  animation.tick(0,true);animation.tick(16,true);const t=animation.time;
  speed=0;animation.tick(32,true);assert.equal(animation.time,t);
  speed=1;animation.toggle();animation.tick(48,true);assert.equal(animation.time,t);
  animation.toggle();animation.tick(1000,true);assert.equal(animation.time,t);
  animation.tick(1016,true);assert.ok(animation.time>t);
  const resumed=animation.time;animation.tick(1032,false);assert.equal(animation.time,resumed);
  assert.equal(animation.timeUniform,uniform);
});
