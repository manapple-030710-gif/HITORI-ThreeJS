import test from 'node:test';
import assert from 'node:assert/strict';
import { presets, deriveSettings } from '../src/v2/config.js';
import { exportPreset, importPreset, cameraForMacro } from '../src/v2/preset-json.js';

function state(){
  const macro={scene:'HITORI Grandeur',...presets['HITORI Grandeur']};
  const overrides={water:{roughness:0.53,speed:0,lightDirectionX:0.4,deepColor:'#345678'},fog:{density:0.0023},rendering:{environmentIntensity:0.8}};
  return {macro,overrides,settings:deriveSettings(macro,overrides),camera:{...cameraForMacro(macro),x:7.3,fov:63},
    skyImage:{dataUrl:null,name:'',autoLink:false,sampleY:0.63},animation:{time:83.7,paused:true}};
}
test('JSON round trip restores resolved world, advanced overrides, shot and animation exactly',()=>{
  const saved=state(), current=state();
  current.macro={...current.macro,...presets['Calm Water'],scene:'Calm Water'};
  current.overrides={};current.settings=deriveSettings(current.macro);current.camera=cameraForMacro(current.macro);
  const json=JSON.parse(JSON.stringify(exportPreset(saved)));
  const result=importPreset(json,current);
  assert.deepEqual(result.state,saved);assert.deepEqual(result.warnings,[]);
  assert.equal(result.assetSpecified,true);
});
test('embedded sky image and linkage sampling survive JSON round trip',()=>{
  const saved=state();saved.skyImage={dataUrl:'data:image/png;base64,AAAA',name:'sky.png',autoLink:true,sampleY:0.55};
  assert.deepEqual(importPreset(exportPreset(saved),state()).state.skyImage,saved.skyImage);
});
test('legacy settings and camera arrays migrate without deleting omitted values',()=>{
  const current=state();
  const result=importPreset({water:{roughness:0.4},camera:{position:[3,6,20],target:[0,1,-90],fov:48},rendering:{exposure:1.2},extra:999},current);
  assert.equal(result.state.settings.water.roughness,0.4);
  assert.equal(result.state.settings.water.speed,0);
  assert.deepEqual(result.state.camera,{x:3,height:6,distance:20,fov:48,target:[0,1,-90]});
  assert.equal(result.state.settings.rendering.exposure,1.2);
  assert.equal(result.assetSpecified,false);
});
test('invalid values, future keys and prototype payloads cannot poison settings',()=>{
  const current=state();
  const source=JSON.parse('{"schemaVersion":99,"macro":{"sky":"missing","height":100},"settings":{"water":{"roughness":"bad","speed":0,"unknown":8,"__proto__":{"polluted":true}}},"shot":{"camera":{"target":[0,null,0]}}}');
  const result=importPreset(source,current);
  assert.equal(result.state.macro.sky,current.macro.sky);
  assert.equal(result.state.macro.height,1);
  assert.equal(result.state.settings.water.speed,0);
  assert.equal(result.state.settings.water.roughness,0.53);
  assert.deepEqual(result.state.camera.target,current.camera.target);
  assert.equal(result.state.settings.water.unknown,undefined);assert.equal({}.polluted,undefined);
  assert.ok(result.warnings.length>=4);
  assert.deepEqual(current,state());
});
test('invalid roots, foreign formats and remote image URLs reject before application',()=>{
  assert.throws(()=>importPreset([],state()));
  assert.throws(()=>importPreset({format:'other',world:{}},state()));
  assert.throws(()=>importPreset({unknown:1},state()));
  assert.throws(()=>importPreset({world:{skyImage:{dataUrl:'https://example.com/image.png'}}},state()));
});
