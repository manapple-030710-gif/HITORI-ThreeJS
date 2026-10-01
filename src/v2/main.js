import * as THREE from 'three';
import '../style.css';
import './style.css';
import { createWaterAnimation } from '../animation/water-animation.js';
import { readSkyPixels, sampleSkyColors } from '../environment/sky-image-colors.js';
import { createEnvironment } from './environment.js';
import { presets, skyPresets, deriveSettings } from './config.js';
import { waterControls } from './advanced.js';
import { exportPreset, importPreset, maxPresetBytes } from './preset-json.js';

document.title='HITORI — Simulator V2';
document.body.classList.add('simulator-v2');
const macro={scene:'HITORI Grandeur',...presets['HITORI Grandeur']};
function presetCamera() {
  const f=macro.framing;
  const p=macro.camera==='Close'?[0,2.5+f*2,4+f*8]:macro.camera==='Wide'?[0,6+f*4,18+f*16]:[0,4+f*3,8+f*14];
  return {x:p[0],height:p[1],distance:p[2],fov:macro.camera==='Close'?46:54,target:[0,p[1]-3.8,p[2]-95]};
}
const cameraAdjust=presetCamera();
const cameraFields=new Map();
let updateCamera=()=>{};
function resetCameraControls() {
  Object.assign(cameraAdjust,presetCamera());
  for(const [key,field] of cameraFields)field.set(cameraAdjust[key]);
}
let overrides={}, pixels=null, imageRequest=0, skyImageAsset=null;
const settings=deriveSettings(macro);
const ui=document.querySelector('#interface');
ui.innerHTML=`<header><span class="wordmark">HITORI</span><span class="subtitle">SIMULATOR / V2</span></header>
  <nav class="versions"><a href="?sim=v1">Simulator V1</a><span>Simulator V2</span></nav>
  <aside><details open><summary>World controls <span>−</span></summary><div class="controls" id="macros"></div></details></aside>
  <div class="scene-caption"><span>01 / HITORI GRANDEUR</span><p>Stillness, on an infinite scale.</p></div>
  <footer><span>1920 × 1080 · REALTIME</span><div><button id="pause">一時停止</button><button id="capture">PNG保存</button><button id="fullscreen">全画面</button><button id="hide">UIを隠す [H]</button></div></footer>`;
const panel=document.querySelector('#macros');
const fields=new Map(), advancedFields=[];
function group(name){const h=document.createElement('h2');h.textContent=name;panel.append(h);}
function control(parent,label,key,value,min,max,step,options,onInput){
  const wrap=document.createElement('label');wrap.textContent=label;
  const output=document.createElement('output');wrap.append(output);
  const input=document.createElement(options?'select':'input');
  if(options)for(const option of options){const el=document.createElement('option');el.value=option;el.textContent=option;input.append(el);}
  else if(typeof value==='string') input.type='color';
  else {input.type='range';input.min=min;input.max=max;input.step=step;}
  input.id=`v2-${key}`;input.setAttribute('aria-label',label);wrap.append(input);parent.append(wrap);
  const decimals=step ? Math.max(0,Math.ceil(-Math.log10(step))) : 2;
  const set=v=>{input.value=v;output.textContent=typeof v==='number'?Number(v).toFixed(decimals):'';};
  set(value);input.addEventListener('input',()=>{const v=input.type==='range'?input.valueAsNumber:input.value;set(v);onInput(v);});
  return {set,input};
}
function add(label,key,min=0,max=1,step=0.01,options){
  fields.set(key,control(panel,label,key,macro[key],min,max,step,options,v=>{
    macro[key]=v;
    if(key==='camera') {resetCameraControls();updateCamera();return;}
    if(key==='scene') {Object.assign(macro,presets[v]);resetCameraControls();}
    if(key==='sky') macro.time=({Morning:7,Evening:18,Night:0})[v]??14;
    // A macro defines a coherent world; detailed overrides are intentionally reset.
    overrides={};sync();
  }));
}
group('Scene');add('Scene Preset','scene',0,1,1,Object.keys(presets));
panel.insertAdjacentHTML('beforeend','<button id="v2-export-preset">Export Preset JSON</button> <button id="v2-import-preset">Import Preset JSON</button><input id="v2-preset-file" type="file" accept="application/json,.json" hidden><p id="v2-preset-status" role="status"></p>');
group('Camera');add('Camera Preset','camera',0,1,1,['Grandeur','Close','Wide']);
for(const [label,key,min,max,step] of [
  ['左右 / Camera X','x',-100,100,0.1],
  ['高さ / Camera Height','height',0.6,40,0.1],
  ['前後 / Camera Z','distance',-40,200,0.1],
  ['FOV','fov',20,90,1],
]) cameraFields.set(key,control(panel,label,`camera-${key}`,cameraAdjust[key],min,max,step,null,v=>{
  cameraAdjust[key]=v;updateCamera();
}));
group('Sky');add('Sky Preset','sky',0,1,1,Object.keys(skyPresets));add('Time / Light','time',0,24,0.05);
group('Water');add('Water Color','color');add('Wave Height','height');add('Water Speed','speed',0,2);add('Randomness','randomness');add('Water Scale / Grandeur','grandeur');add('Clarity / Transparency','clarity');
group('Image');add('Exposure','exposure',0.3,1.8);
const advanced=document.createElement('details');advanced.className='advanced-settings';
advanced.innerHTML='<summary>Advanced / Debug <span>＋</span></summary><p>カメラ以外のマクロ操作で詳細上書きを解除します。V1の独立したGUIは左上から開けます。</p>';
panel.append(advanced);
function detail(group,key,min,max,step){
  const field=control(advanced,key,`${group}-${key}`,settings[group][key],min,max,step,null,v=>{
    (overrides[group]??={})[key]=v;sync();
  });advancedFields.push({group,key,...field});
}
for(const [key,min,max,step] of waterControls)detail('water',key,min,key==='speed'?2:max,step);
for(const key of ['shallowColor','deepColor','bottomTint'])detail('water',key);
detail('fog','density',0,0.008,0.0001);detail('fog','start',0,300,1);detail('fog','horizonBlendWidth',0,2,0.01);detail('fog','color');
detail('rendering','environmentIntensity',0,1.5,0.01);
advanced.insertAdjacentHTML('beforeend','<label>空画像を選択<input id="v2-image" type="file" accept="image/png,image/jpeg,image/webp"></label><button id="v2-clear-image">空画像を解除</button><label class="auto-link"><input id="v2-auto" type="checkbox" checked>画像の色に自動連動</label><label>地平線サンプル位置<input id="v2-sample" type="range" min="0.45" max="0.8" step="0.01" value="0.55"></label><p id="v2-status" role="status"></p><button id="v2-reset">HITORI Grandeurに戻す</button>');

try {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(1920,1080,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  document.querySelector('#stage').append(renderer.domElement);
  const scene=new THREE.Scene();
  // Future architectural content belongs here, independently of the environment.
  const architecture=new THREE.Group();architecture.name='ArchitectureRoot';scene.add(architecture);
  const camera=new THREE.PerspectiveCamera(52,16/9,0.1,20000);
  const animation=createWaterAnimation(()=>settings.water.speed);
  const environment=createEnvironment(scene,settings,animation.timeUniform);
  let frameMs=16.7,lastFrame=0;
  const status=document.querySelector('#v2-status');
  function applyCamera(){
    camera.position.set(cameraAdjust.x,cameraAdjust.height,cameraAdjust.distance);
    camera.fov=cameraAdjust.fov;
    camera.lookAt(...cameraAdjust.target);camera.updateProjectionMatrix();
  }
  updateCamera=applyCamera;
  function imageColors(){environment.setImageColors(pixels&&document.querySelector('#v2-auto').checked?sampleSkyColors(pixels,Number(document.querySelector('#v2-sample').value)):null);}
  // This function is assigned before any user input; controls update uniforms only.
  sync=()=>{
    Object.assign(settings,deriveSettings(macro,overrides));
    environment.apply();imageColors();applyCamera();renderer.toneMappingExposure=settings.rendering.exposure;
    for(const [key,field] of fields)field.set(macro[key]);
    for(const [key,field] of cameraFields)field.set(cameraAdjust[key]);
    for(const field of advancedFields)field.set(settings[field.group][field.key]);
    document.querySelector('.scene-caption span').textContent=`01 / ${macro.scene.toUpperCase()}`;
  };
  sync();
  function draw(now){
    animation.tick(now,!document.hidden);
    if(lastFrame)frameMs=frameMs*0.95+(now-lastFrame)*0.05;lastFrame=now;
    renderer.render(scene,camera);requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange',()=>{animation.resetClock();lastFrame=0;});
  requestAnimationFrame(draw);
  document.querySelector('#pause').onclick=e=>{animation.toggle();e.target.textContent=animation.paused?'再生':'一時停止';};
  document.querySelector('#capture').onclick=()=>{
    renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{
      if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='HITORI-V2.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'image/png');
  };
  document.querySelector('#fullscreen').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status.textContent='全画面に切り替えられませんでした。';}
  };
  const restore=document.querySelector('#restore');
  function toggleUI(){ui.hidden=!ui.hidden;restore.hidden=!ui.hidden;document.body.classList.toggle('clean',ui.hidden);}
  document.querySelector('#hide').onclick=toggleUI;restore.onclick=toggleUI;
  document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))toggleUI();});
  document.querySelector('#v2-auto').onchange=imageColors;document.querySelector('#v2-sample').oninput=imageColors;
  function clearImage(){imageRequest++;pixels=null;skyImageAsset=null;environment.setSkyImage(null);document.querySelector('#v2-image').value='';status.textContent='';sync();}
  document.querySelector('#v2-clear-image').onclick=clearImage;
  document.querySelector('#v2-reset').onclick=()=>{Object.assign(macro,{scene:'HITORI Grandeur'},presets['HITORI Grandeur']);resetCameraControls();overrides={};clearImage();};
  document.querySelector('#v2-image').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    const request=++imageRequest,url=URL.createObjectURL(file);
    let texture=null;
    try{
      texture=await new THREE.TextureLoader().loadAsync(url);
      const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
      if(request!==imageRequest){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;pixels=readSkyPixels(texture.image);
      skyImageAsset={dataUrl,name:file.name};
      environment.setSkyImage(texture);texture=null;imageColors();status.textContent=file.name;
    }catch{texture?.dispose();if(request===imageRequest)status.textContent='画像を読み込めませんでした。PNG / JPG / WebPを選んでください。';}
    finally{URL.revokeObjectURL(url);}
  };
  const presetStatus=document.querySelector('#v2-preset-status');
  function presetState(){
    return {macro,overrides,settings,camera:cameraAdjust,
      skyImage:{dataUrl:skyImageAsset?.dataUrl??null,name:skyImageAsset?.name??'',autoLink:document.querySelector('#v2-auto').checked,sampleY:Number(document.querySelector('#v2-sample').value)},
      animation:{time:animation.time,paused:animation.paused}};
  }
  document.querySelector('#v2-export-preset').onclick=()=>{
    const json=JSON.stringify(exportPreset(presetState()),null,2);
    const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='HITORI-V2-Preset.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);presetStatus.textContent='全設定をJSONに保存しました。';
  };
  const presetFile=document.querySelector('#v2-preset-file');
  document.querySelector('#v2-import-preset').onclick=()=>presetFile.click();
  presetFile.onchange=async()=>{
    const file=presetFile.files[0];if(!file)return;
    const request=++imageRequest;
    let texture=null;
    try{
      if(file.size>maxPresetBytes)throw new Error('Presetは64MB以内にしてください。');
      const result=importPreset(JSON.parse(await file.text()),presetState());
      const {state,warnings,assetSpecified}=result;
      // Decode all assets before applying anything, so invalid files leave the scene intact.
      let importedPixels=null;
      if(assetSpecified && state.skyImage.dataUrl){
        texture=await new THREE.TextureLoader().loadAsync(state.skyImage.dataUrl);
        texture.colorSpace=THREE.SRGBColorSpace;importedPixels=readSkyPixels(texture.image);
      }
      if(request!==imageRequest){texture?.dispose();return;}
      Object.assign(macro,state.macro);overrides=state.overrides;Object.assign(cameraAdjust,state.camera);
      if(assetSpecified){
        pixels=importedPixels;skyImageAsset=state.skyImage.dataUrl?{dataUrl:state.skyImage.dataUrl,name:state.skyImage.name}:null;
        environment.setSkyImage(texture);texture=null;
        document.querySelector('#v2-image').value='';
        document.querySelector('#v2-auto').checked=state.skyImage.autoLink;
        document.querySelector('#v2-sample').value=state.skyImage.sampleY;
        status.textContent=state.skyImage.name;
      }
      sync();
      // Explicit preset restoration keeps the controller's uniform object and RAF intact.
      animation.timeUniform.value=state.animation.time;
      if(animation.paused!==state.animation.paused)animation.toggle();
      animation.resetClock();
      document.querySelector('#pause').textContent=animation.paused?'再生':'一時停止';
      renderer.render(scene,camera);
      presetStatus.textContent=warnings.length?`読み込み完了（${warnings.length}件を補正・無視）：${warnings.slice(0,3).join(' / ')}`:'全設定を復元しました。';
    }catch(error){texture?.dispose();presetStatus.textContent=`読み込めませんでした：${error.message}`;}
    finally{presetFile.value='';}
  };
  const diagnostics=document.createElement('button');diagnostics.textContent='表示診断を更新';advanced.append(diagnostics);
  diagnostics.onclick=()=>{status.textContent=`Frame ≈ ${frameMs.toFixed(1)} ms / ${renderer.info.render.triangles.toLocaleString()} triangles / ${renderer.info.render.calls} calls（GPU時間ではありません）`;};
}catch(error){const el=document.querySelector('#error');el.hidden=false;el.textContent=`V2を開始できませんでした: ${error.message}`;console.error(error);}
function sync(){}
