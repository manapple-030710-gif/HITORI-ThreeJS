import { presets, skyPresets, deriveSettings } from './config.js';
import { waterControls } from './advanced.js';

export const presetFormat='HITORI.SimulatorV2';
export const presetVersion=1;
export const maxPresetBytes=64*1024*1024;
const record=v=>v!==null && typeof v==='object' && !Array.isArray(v);
const own=(v,key)=>record(v) && Object.hasOwn(v,key);
const color=v=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const macroRanges={height:[0,1],speed:[0,2],randomness:[0,1],grandeur:[0,1],clarity:[0,1],time:[0,24],framing:[0,1],exposure:[0.3,1.8]};
const choices={scene:Object.keys(presets),sky:Object.keys(skyPresets),camera:['Grandeur','Close','Wide']};
const waterRanges=Object.fromEntries(waterControls.map(([key,min,max])=>[key,[min,key==='speed'?2:max]]));
Object.assign(waterRanges,{amplitude:[0,0.5],wavelength:[2,100]});
const ranges={water:waterRanges,fog:{density:[0,0.008],start:[0,300],horizonBlendWidth:[0,2]},
  lighting:{intensity:[0,3]},rendering:{exposure:[0.01,5],environmentIntensity:[0,1.5]},
  sky:{time:[0,24]},world:{randomness:[0,1],grandeur:[0,1],clouds:[0,1]}};

export function cameraForMacro(macro) {
  const f=macro.framing;
  const p=macro.camera==='Close'?[0,2.5+f*2,4+f*8]:macro.camera==='Wide'?[0,6+f*4,18+f*16]:[0,4+f*3,8+f*14];
  return {x:p[0],height:p[1],distance:p[2],fov:macro.camera==='Close'?46:54,target:[0,p[1]-3.8,p[2]-95]};
}

// No renderer references: this format can later be exported as world-only or shot-only.
export function exportPreset(state) {
  const {camera,exposure,framing,...worldMacro}=state.macro;
  const worldSettings=Object.fromEntries(['sky','water','fog','lighting','rendering','world'].map(key=>[key,structuredClone(state.settings[key])]));
  delete worldSettings.rendering.exposure;
  return {
    format:presetFormat,schemaVersion:presetVersion,
    world:{macro:worldMacro,settings:worldSettings,advanced:structuredClone(state.overrides),skyImage:structuredClone(state.skyImage)},
    shot:{cameraPreset:camera,framing,camera:structuredClone(state.camera),exposure:{macro:exposure,effective:state.settings.rendering.exposure},animation:structuredClone(state.animation)},
  };
}

// Whitelist every field. Unknown fields never reach settings or Object.assign.
// Missing fields preserve the current state, making partial/older files useful.
export function importPreset(document,current) {
  if(!record(document)) throw new Error('Preset JSONのルートはオブジェクトにしてください。');
  if(own(document,'format') && document.format!==presetFormat) throw new Error('HITORI Simulator V2のPresetではありません。');
  if(!['world','shot','macro','settings','overrides','cameraAdjust','camera','sky','water','fog','lighting','rendering','scene'].some(k=>own(document,k)))
    throw new Error('読み込める設定項目がありません。');
  const warnings=[];
  if(own(document,'schemaVersion') && document.schemaVersion!==presetVersion) warnings.push('異なるschemaVersionの既知項目のみ読み込みました');
  const next=structuredClone(current);
  const world=record(document.world)?document.world:{};
  const shot=record(document.shot)?document.shot:{};
  function number(v,min,max,path) {
    if(typeof v!=='number' || !Number.isFinite(v)){warnings.push(`${path}: 不正な値を無視`);return undefined;}
    const n=Math.max(min,Math.min(max,v));if(n!==v)warnings.push(`${path}: 範囲内に補正`);return n;
  }
  function vector(v,path,limit=20000) {
    if(!Array.isArray(v)||v.length!==3||v.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>limit)){
      warnings.push(`${path}: 不正なベクトルを無視`);return undefined;
    }return [...v];
  }
  const macroSource=record(world.macro)?world.macro:record(document.macro)?document.macro:document;
  for(const key of Object.keys(next.macro)) {
    if(!own(macroSource,key))continue;
    const v=macroSource[key];
    if(macroRanges[key]){const n=number(v,...macroRanges[key],key);if(n!==undefined)next.macro[key]=n;}
    else if(choices[key]?.includes(v)||key==='color'&&color(v))next.macro[key]=v;
    else warnings.push(`${key}: 未対応の値を無視`);
  }
  if(own(shot,'cameraPreset')){
    if(choices.camera.includes(shot.cameraPreset))next.macro.camera=shot.cameraPreset;
    else warnings.push('cameraPreset: 未対応の値を無視');
  }
  if(own(shot,'framing')){const n=number(shot.framing,0,1,'framing');if(n!==undefined)next.macro.framing=n;}
  if(own(shot.exposure,'macro')){const n=number(shot.exposure.macro,0.3,1.8,'exposure');if(n!==undefined)next.macro.exposure=n;}

  const baseline=deriveSettings(next.macro);
  function sanitizeGroups(source) {
    const out={};if(!record(source))return out;
    for(const group of ['sky','water','fog','lighting','rendering','world']){
      if(!record(source[group]))continue;
      const values={};
      for(const key of Object.keys(baseline[group])){
        if(!own(source[group],key))continue;
        const v=source[group][key],path=`${group}.${key}`;
        if(ranges[group]?.[key]){const n=number(v,...ranges[group][key],path);if(n!==undefined)values[key]=n;}
        else if(typeof baseline[group][key]==='string'){
          if(color(baseline[group][key])?color(v):group==='water'&&key==='colorCorrection'&&['none','soften','white','gray','blue'].includes(v))values[key]=v;
          else warnings.push(`${path}: 不正な値を無視`);
        }else if(key==='direction'){const n=vector(v,path,1);if(n)values[key]=n;}
      }
      if(Object.keys(values).length)out[group]=values;
    }return out;
  }
  const advanced=world.advanced??document.overrides;
  if(record(advanced))next.overrides=sanitizeGroups(advanced);
  const resolved=sanitizeGroups(world.settings??document.settings??document);
  // Actual saved settings take precedence; retain the macro/override distinction where possible.
  for(const [group,values] of Object.entries(resolved))for(const [key,v] of Object.entries(values)){
    if(!equal(v,baseline[group][key])||own(next.overrides[group],key))(next.overrides[group]??={})[key]=v;
  }
  if(own(shot.exposure,'effective')){
    const n=number(shot.exposure.effective,0.01,5,'exposure.effective');
    if(n!==undefined && n!==baseline.rendering.exposure)(next.overrides.rendering??={}).exposure=n;
  }
  const cameraSource=shot.camera??document.cameraAdjust??document.camera;
  if(next.macro.camera!==current.macro.camera||next.macro.framing!==current.macro.framing) next.camera=cameraForMacro(next.macro);
  if(record(cameraSource)){
    for(const [key,min,max] of [['x',-100,100],['height',0.6,40],['distance',-40,200],['fov',20,90]]){
      if(own(cameraSource,key)){const n=number(cameraSource[key],min,max,`camera.${key}`);if(n!==undefined)next.camera[key]=n;}
    }
    if(own(cameraSource,'position')){
      const p=vector(cameraSource.position,'camera.position');
      if(p){next.camera.x=Math.max(-100,Math.min(100,p[0]));next.camera.height=Math.max(0.6,Math.min(40,p[1]));next.camera.distance=Math.max(-40,Math.min(200,p[2]));}
    }
    if(own(cameraSource,'target')){const v=vector(cameraSource.target,'camera.target');if(v)next.camera.target=v;}
    const delta=[next.camera.x,next.camera.height,next.camera.distance].reduce((sum,v,i)=>sum+(v-next.camera.target[i])**2,0);
    if(delta<1e-6){warnings.push('camera: 位置と注視点が重なるため元の画角を保持');next.camera=structuredClone(current.camera);}
  }
  if(record(shot.animation)){
    if(own(shot.animation,'time')){const n=number(shot.animation.time,0,1e9,'animation.time');if(n!==undefined)next.animation.time=n;}
    if(typeof shot.animation.paused==='boolean')next.animation.paused=shot.animation.paused;
  }
  const assetSpecified=own(world,'skyImage');
  if(assetSpecified){
    const image=world.skyImage;
    if(image!==null && !record(image))throw new Error('skyImageが不正です。');
    const dataUrl=image?.dataUrl??null;
    if(dataUrl!==null && (typeof dataUrl!=='string'||!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(dataUrl)))
      throw new Error('空画像はPNG / JPG / WebPの埋め込みデータにしてください。');
    const sample=number(image?.sampleY??0.55,0.45,0.8,'skyImage.sampleY');
    next.skyImage={dataUrl,name:typeof image?.name==='string'?image.name.slice(0,255):'',autoLink:typeof image?.autoLink==='boolean'?image.autoLink:true,sampleY:sample??current.skyImage.sampleY};
  }
  next.settings=deriveSettings(next.macro,next.overrides);
  return {state:next,warnings,assetSpecified};
}
