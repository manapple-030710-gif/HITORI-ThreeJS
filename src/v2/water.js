import * as THREE from 'three';
import { skyGLSL } from './sky.js';
import { waterVertexShader } from './vertex.js';
import { waterSpectrumGLSL } from './spectrum.js';

// 既存の自動補正量（水色12%、反射18%、光色14%）に掛ける距離係数。
export const imageColorDepth = {
  nearDistance: 12, middleDistance: 90, farDistance: 450,
  nearWeight: 0.15, middleWeight: 0.45, farWeight: 0.8,
  fogOnsetDistance: 35,
  horizonMatch: 0.75,
};

// 水面の見た目だけを調整。波の変位・速度・再生状態には触れません。
const waterAppearance = {
  bedBrightness: 0.62,
  opticalDepth: 1.15,
  bedVariation: 0.025,
};

export function createWater(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms,
    // 不透明の空を先に描画し、水平線に近い水面だけ背景へ溶かします。
    transparent: true,
    vertexShader: waterVertexShader,
    fragmentShader: `${skyGLSL}
      ${waterSpectrumGLSL}
      uniform float uSpecularScatter;
      uniform float uStrength;
      uniform float uRoughness;
      uniform float uWaterOpacity;
      uniform float uBottomVisibility;
      uniform float uDepthFadeStrength;
      uniform float uFresnelStrength;
      uniform float uReflectionStrength;
      uniform float uDepthTint;
      uniform float uEnvironmentGain;
      uniform float uSpecularStrength;
      uniform float uSpecularSharpness;
      uniform vec3 uSpecularDirection;
      uniform float uMicroNormalStrength;
      uniform float uMicroNormalScale;
      uniform float uMicroNormalSpeed;
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform float uDepthVariationStrength;
      uniform float uDepthVariationScale;
      uniform float uHighlightVariation;
      uniform float uHighlightVariationScale;
      uniform float uCausticStrength;
      uniform float uCausticScale;
      uniform float uCausticSpeed;
      uniform float uFogStart;
      uniform float uHorizonBlendWidth;
      uniform vec3 uWaterColor;
      uniform float uWaterCorrectionMode;
      uniform vec3 uWaterCorrectionColor;
      uniform float uGeometryProof;
      uniform float uAutoImageFog;
      uniform vec3 uBaseWaterColor;
      uniform vec3 uBaseLightColor;
      uniform vec3 uBaseZenith;
      uniform vec3 uBaseHorizon;
      uniform vec3 uBaseFogColor;
      uniform vec3 uImageHorizon;
      varying vec3 vWorld;
      varying vec2 vSwellSlope;
      float imageDepthWeight(float distanceToCamera) {
        float nearToMiddle = smoothstep(${imageColorDepth.nearDistance.toFixed(1)}, ${imageColorDepth.middleDistance.toFixed(1)}, distanceToCamera);
        float middleToFar = smoothstep(${imageColorDepth.middleDistance.toFixed(1)}, ${imageColorDepth.farDistance.toFixed(1)}, distanceToCamera);
        return mix(${imageColorDepth.nearWeight}, ${imageColorDepth.middleWeight}, nearToMiddle)
          + (${imageColorDepth.farWeight} - ${imageColorDepth.middleWeight}) * middleToFar;
      }
      vec3 waterSkyColor(vec3 direction, float weight) {
        return sampleSky(direction, mix(uBaseZenith,uZenith,weight),
          mix(uBaseHorizon,uHorizon,weight), mix(uBaseFogColor,uFogColor,weight),
          mix(uBaseLightColor,uEnvironmentLight,weight), uEnvironmentIntensity) * uEnvironmentGain;
      }
      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx)*0.1031);
        q += dot(q,q.yzx+33.33);
        return fract((q.x+q.y)*q.z);
      }
      // Quintic noise and its analytic gradient: continuous, non-repeating normals.
      vec3 noiseGradient(vec2 p) {
        vec2 i=floor(p), f=fract(p);
        vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
        vec2 du=30.0*f*f*(f*(f-2.0)+1.0);
        float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
        float k=a-b-c+d;
        return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du*(vec2(b-a,c-a)+k*u.yx));
      }
      void main() {
        vec2 p=vWorld.xz;
        float distanceToCamera=length(cameraPosition-vWorld);
        float footprint=max(length(dFdx(p)),length(dFdy(p)));
        vec3 broad=noiseGradient(p*0.085+vec2(uTime*0.013,-uTime*0.009));
        float detailFade=1.0-smoothstep(12.0,65.0,distanceToCamera);
        // Pixel-level medium normals avoid interpolation smoothing across triangles.
        vec3 wave=displacedSpectrum(p,footprint);
        vec3 small=spectrumBand(p,uSmallWaveScale,uSmallWaveSpeed,29.0,9,footprint);
        float smallFade=1.0-smoothstep(12.0,95.0,distanceToCamera);
        vec2 smallSlope=small.yz*uSmallWaveScale*0.10*uSmallWaveStrength
          *smallFade*min(uStrength,2.5);
        vec2 surfaceSlope=wave.yz+smallSlope;
        float unresolved=0.0004*uSmallWaveStrength*uSmallWaveStrength*(1.0-smallFade);
        // 追加の微細法線のみ。既存の波・頂点・時刻の進行には触れません。
        // 距離とピクセルの占有面積で減衰し、遠景のちらつきを防ぎます。
        float microFade=(1.0-smoothstep(8.0,55.0,distanceToCamera))
          *(1.0-smoothstep(0.15,0.75,footprint*uMicroNormalScale*1.37));
        if (uMicroNormalStrength > 0.0 && microFade > 0.0) {
          float microTime=uTime*uMicroNormalSpeed;
          mat2 microRotation=mat2(0.8,-0.6,0.6,0.8);
          vec3 microA=noiseGradient(p*uMicroNormalScale+vec2(microTime,-microTime*0.73));
          vec3 microB=noiseGradient(microRotation*p*uMicroNormalScale*1.37+vec2(-microTime*0.61,microTime*0.89)+17.3);
          surfaceSlope+=(microA.yz*0.65+transpose(microRotation)*microB.yz*0.35)
            *uMicroNormalStrength*microFade*min(uStrength,1.0);
        }
        vec3 normal=normalize(vec3(-surfaceSlope.x,1.0,-surfaceSlope.y));
        vec3 view=normalize(cameraPosition-vWorld);
        normal=normalize(mix(vec3(0,1,0),normal,smoothstep(0.0,0.04,view.y)));
        float nv=max(dot(normal,view),0.001);
        // Unresolved facets merge into the existing broad wave normal at distance.
        vec3 broadNormal=normalize(vec3(-vSwellSlope.x,1.0,-vSwellSlope.y));
        vec3 reflectionNormal=normalize(mix(normal,broadNormal,
          smoothstep(25.0,160.0,distanceToCamera)*0.75));
        reflectionNormal=normalize(mix(vec3(0,1,0),reflectionNormal,0.72));
        vec3 reflected=reflect(-view,reflectionNormal);
        float roughness=clamp(uRoughness+sqrt(unresolved)*uStrength
          +(broad.x-0.5)*0.035*detailFade*min(uStrength,1.0),0.04,0.65);
        // Integrate a broad sky lobe; unresolved detail becomes roughness, not sparkle.
        vec3 tangent=normalize(cross(abs(reflected.y)>0.99 ? vec3(1,0,0) : vec3(0,1,0),reflected));
        vec3 bitangent=cross(reflected,tangent);
        float spread=roughness*roughness*mix(2.7,1.5,uGrandeur);
        float imageWeight=mix(1.0,imageDepthWeight(distanceToCamera),uAutoImageFog);
        if (uWaterCorrectionMode == 1.0) imageWeight*=mix(1.0,0.5,uAutoImageFog);
        vec3 reflection=waterSkyColor(reflected,imageWeight)*0.40;
        reflection+=waterSkyColor(normalize(reflected+tangent*spread),imageWeight)*0.15;
        reflection+=waterSkyColor(normalize(reflected-tangent*spread),imageWeight)*0.15;
        reflection+=waterSkyColor(normalize(reflected+bitangent*spread),imageWeight)*0.15;
        reflection+=waterSkyColor(normalize(reflected-bitangent*spread),imageWeight)*0.15;
        // A downward reflection ray sees the water layer, not a white sky horizon.
        float skyVisibility=smoothstep(-0.10,0.10,reflected.y);
        skyVisibility=mix(skyVisibility,1.0,smoothstep(100.0,500.0,distanceToCamera));
        reflection*=mix(0.48,1.0,skyVisibility);
        // 空気→水（IOR 1.333）の非偏光Fresnel。既存の粗さと強度UIを維持。
        float waterIOR=1.333;
        float fresnelView=clamp(mix(nv,sqrt(nv),roughness*0.35),0.001,1.0);
        float cosTransmitted=sqrt(1.0-(1.0-fresnelView*fresnelView)/(waterIOR*waterIOR));
        float rs=(fresnelView-waterIOR*cosTransmitted)/(fresnelView+waterIOR*cosTransmitted);
        float rp=(waterIOR*fresnelView-cosTransmitted)/(waterIOR*fresnelView+cosTransmitted);
        float fresnel=0.5*(rs*rs+rp*rp);
        // 粗い水面では浅い角度でも完全な鏡にせず、水中の寄与を少し残します。
        fresnel=clamp(fresnel*uFresnelStrength,0.0,1.0-0.3*roughness*roughness);
        // 浅い水層を通った水底光を近似。背景を透かすアルファには依存しません。
        vec3 waterTint=mix(uBaseWaterColor,uWaterColor,imageWeight);
        // ゆるい仮想深度。波形を変えず、水中色だけを近景～中景で変化させます。
        float depthFade=(1.0-smoothstep(15.0,160.0,distanceToCamera))
          *(1.0-smoothstep(0.3,1.0,footprint*uDepthVariationScale));
        if (uDepthVariationStrength > 0.0 && depthFade > 0.0) {
          float depthMask=noiseGradient(p*uDepthVariationScale+vec2(8.7,23.1)).x;
          depthMask=smoothstep(0.15,0.85,depthMask);
          vec3 depthColor=mix(uShallowColor,uDeepColor,depthMask);
          waterTint=mix(waterTint,depthColor,uDepthVariationStrength*depthFade);
        }
        vec3 lightTint=mix(uBaseLightColor,uEnvironmentLight,imageWeight);
        float refractedCos=sqrt(1.0-(1.0-nv*nv)/(1.333*1.333));
        float layerDepth=${waterAppearance.opticalDepth}+0.18*(broad.x-0.5)*uStrength;
        vec3 transmission=exp(-vec3(0.36,0.29,0.25)*layerDepth*uDepthTint/max(refractedCos,0.5));
        float bedDetail=(broad.x-0.5)*${waterAppearance.bedVariation}*detailFade*uStrength;
        vec3 bed=waterTint*(${waterAppearance.bedBrightness}+bedDetail);
        // 擬似コースティクスは水中光の乗算だけ。発光や網目模様は追加しません。
        float causticFade=(1.0-smoothstep(8.0,65.0,distanceToCamera))
          *(1.0-smoothstep(0.2,0.9,footprint*uCausticScale*1.41));
        if (uCausticStrength > 0.0 && causticFade > 0.0) {
          float driftTime=uTime*uCausticSpeed;
          float driftA=noiseGradient(p*uCausticScale+vec2(driftTime,-driftTime*0.63)).x;
          float driftB=noiseGradient(vec2(-p.y,p.x)*uCausticScale*1.41+vec2(-driftTime*0.71,driftTime*0.49)+31.7).x;
          float luminanceDrift=driftA+driftB-1.0;
          bed*=1.0+luminanceDrift*uCausticStrength*causticFade;
        }
        vec3 transmitted=(bed*transmission+waterTint*0.16*(vec3(1.0)-transmission))
          *lightTint*uEnvironmentIntensity*uEnvironmentGain;
        // 法線・波は変えず、材質の反射寄与だけ調整。遠方の反射を控えめに。
        float reflectionFade=mix(1.0,0.78,smoothstep(70.0,600.0,distanceToCamera));
        // Smith-like visibility removes bright back-facing crests without flattening waves.
        float facetVisibility=2.0*nv/(nv+sqrt(roughness*roughness+(1.0-roughness*roughness)*nv*nv));
        facetVisibility=mix(facetVisibility,1.0,smoothstep(60.0,260.0,distanceToCamera));
        float reflectionWeight=clamp(fresnel*uReflectionStrength*reflectionFade*facetVisibility,0.0,0.94);
        vec3 color=mix(transmitted,reflection,reflectionWeight);
        // 粗さで広げた控えめな方向性ローブ。既存IOR Fresnelをそのまま利用。
        float nl=max(dot(normal,uSpecularDirection),0.0);
        vec3 halfVector=view+uSpecularDirection;
        vec2 scatterSlope=surfaceSlope+smallSlope*(uSpecularScatter-1.0);
        vec3 specularNormal=normalize(vec3(-scatterSlope.x,1.0,-scatterSlope.y));
        specularNormal=normalize(mix(normal,specularNormal,smallFade));
        if (uSpecularStrength > 0.0 && nl > 0.0 && dot(halfVector,halfVector)>0.000001) {
          vec3 halfDirection=normalize(halfVector);
          float exponent=mix(uSpecularSharpness,8.0,roughness*roughness);
          float lobe=pow(max(dot(specularNormal,halfDirection),0.0),exponent);
          // Resolve broad reflected light separately from the tiny facets, with one light direction.
          float broadLobe=pow(max(dot(broadNormal,halfDirection),0.0),max(6.0,exponent*0.35));
          lobe=mix(lobe,broadLobe,0.25*smoothstep(18.0,150.0,distanceToCamera));
          float specularFade=mix(1.0,0.35,smoothstep(40.0,850.0,distanceToCamera));
          float specular=uSpecularStrength*lobe*nl*fresnel*specularFade*facetVisibility*3.0;
          float highlightFade=(1.0-smoothstep(30.0,180.0,distanceToCamera))
            *(1.0-smoothstep(0.3,1.0,footprint*uHighlightVariationScale));
          if (uHighlightVariation > 0.0 && highlightFade > 0.0) {
            float highlightMask=noiseGradient(p*uHighlightVariationScale+vec2(41.3,-12.7)).x;
            // 最大でも既存ハイライトの0.75～1.25倍。Fresnelや鋭さは維持。
            specular*=1.0+(highlightMask-0.5)*uHighlightVariation*highlightFade;
          }
          color+=uEnvironmentLight*uEnvironmentIntensity*specular;
        }
        // 水面のみ、自動補正の後・距離霧の前に微調整。霧や空の色は変えません。
        if (uWaterCorrectionMode == 1.0) {
          float gray=dot(color,vec3(0.2126,0.7152,0.0722));
          color=mix(color,vec3(gray),0.25);
        } else if (uWaterCorrectionMode == 2.0) {
          color=mix(color,uWaterCorrectionColor*uEnvironmentIntensity,0.08);
        }
        float fogDistance=max(distanceToCamera-uFogStart,0.0);
        // 開始位置での変化率をゼロにし、距離霧へ穏やかにつなぎます。
        float softFogDistance=fogDistance*(1.0-exp(-fogDistance/${imageColorDepth.fogOnsetDistance.toFixed(1)}));
        fogDistance=mix(fogDistance,softFogDistance,uAutoImageFog);
        float fogAmount=1.0-exp(-fogDistance*max(uFogDensity,0.0));
        // Shared horizon function includes the configured fog color and soft daylight.
        vec3 horizon=timeSkyColor(normalize(vec3(-view.x,0.0,-view.z)));
        // 画像連動時の距離霧は採取色を使い、固定の白い光を加算しません。
        // 遠方ほど採取した地平線色へ戻し、霧の白・灰補正が帯に残るのを抑えます。
        vec3 imageFog=mix(uEnvironmentFog,uImageHorizon,${imageColorDepth.horizonMatch}*smoothstep(0.0,1.0,fogAmount));
        horizon=mix(horizon,imageFog,uAutoImageFog);
        // Distant information grows in scale: integrate the same sky light above the horizon.
        // No new wave or animated noise: this is cloud illumination in the existing material.
        vec3 farDirection=normalize(vec3(-view.x,0.10+22.0/(distanceToCamera+150.0),-view.z));
        float farCloud=cloudField(farDirection.xz/(0.16+farDirection.y)*1.8+vec2(6.2,9.7));
        float farLight=skyLightZone(farDirection)
          *mix(1.0,0.35,smoothstep(0.30,0.72,farCloud)*uCloudAmount);
        float farResponse=smoothstep(70.0,350.0,distanceToCamera)*(1.0-fogAmount);
        color*=1.0+farResponse*(0.35*(farCloud-0.5)+0.22*farLight);
        color+=uEnvironmentLight*uEnvironmentIntensity*uEnvironmentGain
          *farResponse*farLight*0.14*uReflectionStrength;
        color=mix(color,horizon,fogAmount);
        if (uGeometryProof > 0.5) color = mix(color, vec3(0.05,0.18,0.22), 0.7);
        // 距離霧の濃さとは独立した視角の帯。白を足さず、実際の背景へ合成。
        // 近景60以内は保護し、180まで滑らかに有効化します。
        float boundaryAlpha=1.0;
        if (uHorizonBlendWidth > 0.0) {
          float horizonAngle=atan(abs(view.y),length(view.xz));
          float edgeBlend=1.0-smoothstep(0.0,uHorizonBlendWidth,horizonAngle);
          boundaryAlpha=1.0-edgeBlend*smoothstep(60.0,180.0,distanceToCamera);
        }
        // 近景だけ実際の底面を透かす。反射・距離霧が強いほど透過を抑えます。
        float bottomVisibility=uBottomVisibility*(1.0-uWaterOpacity)*(1.0-reflectionWeight)*(1.0-fogAmount)
          *(1.0-smoothstep(18.0,60.0,distanceToCamera*uDepthFadeStrength));
        gl_FragColor=vec4(color,boundaryAlpha*(1.0-bottomVisibility));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  // 148,225 vertices / 294,912 triangles. Dense nearby, wide coverage at the horizon.
  // A uniform 16km grid would leave near-camera vertices far too sparse.
  const proof = uniforms.uGeometryProof.value > 0.5;
  const geometry = new THREE.PlaneGeometry(proof ? 16 : 16000, proof ? 16 : 16000,
    proof ? 128 : 384, proof ? 128 : 384);
  if (!proof) {
    const positions = geometry.attributes.position;
    const distribute = coordinate => {
      const u = coordinate / 8000;
      return 25*u + 7975*Math.pow(u,5);
    };
    for (let i=0; i<positions.count; i++) {
      positions.setXY(i, distribute(positions.getX(i)), distribute(positions.getY(i)));
    }
    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
  }
  const mesh=new THREE.Mesh(geometry,material);
  mesh.rotation.x=-Math.PI/2;
  if (proof) mesh.position.z = -12;
  // Shader displacement is not represented by CPU bounds.
  mesh.frustumCulled = false;
  mesh.name='Multiscale water';
  return mesh;
}

export function createWaterBed(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uBedColor: uniforms.uBottomTint,
      uBottomVariationStrength: uniforms.uBottomVariationStrength,
      uBottomVariationScale: uniforms.uBottomVariationScale,
      uBottomVisibility: uniforms.uBottomVisibility,
      uDepthFadeStrength: uniforms.uDepthFadeStrength,
      uTime: uniforms.uTime,
      uStrength: uniforms.uStrength,
      uWavelength: uniforms.uWavelength,
      uEnvironmentLight: uniforms.uEnvironmentLight,
      uEnvironmentIntensity: uniforms.uEnvironmentIntensity,
      uEnvironmentGain: uniforms.uEnvironmentGain,
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec3 vBedWorld;
      void main() {
        vec4 world=modelMatrix*vec4(position,1.0);
        vBedWorld=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader: `uniform vec3 uBedColor;
      uniform float uBottomVariationStrength;
      uniform float uBottomVariationScale;
      uniform float uBottomVisibility;
      uniform float uDepthFadeStrength;
      uniform float uTime;
      uniform float uStrength;
      uniform float uWavelength;
      uniform vec3 uEnvironmentLight;
      uniform float uEnvironmentIntensity;
      uniform float uEnvironmentGain;
      varying vec3 vBedWorld;
      float bedHash(vec2 p) {
        vec3 q=fract(vec3(p.xyx)*0.1031);
        q+=dot(q,q.yzx+33.33);
        return fract((q.x+q.y)*q.z);
      }
      float bedNoise(vec2 p) {
        vec2 i=floor(p),f=fract(p);
        vec2 s=f*f*f*(f*(f*6.0-15.0)+10.0);
        return mix(mix(bedHash(i),bedHash(i+vec2(1,0)),s.x),
          mix(bedHash(i+vec2(0,1)),bedHash(i+vec2(1,1)),s.x),s.y);
      }
      void main() {
        // 水面の透過が消えた先で底も消し、水平線の背景合成を妨げません。
        float distanceToCamera=length(cameraPosition-vBedWorld)*uDepthFadeStrength;
        float opacity=(1.0-smoothstep(65.0,110.0,distanceToCamera))*step(0.0001,uBottomVisibility);
        vec2 p=vBedWorld.xz;
        // 既存の波と同じ時刻・基準波長を参照。底の頂点自体は動かしません。
        float k=6.28318530718/uWavelength;
        float phase=dot(p,normalize(vec2(1.0,0.35)))*k-uTime*sqrt(9.81*k)*0.70;
        float drift=min(uStrength,1.5)*(1.0-smoothstep(12.0,65.0,distanceToCamera));
        vec2 offset=vec2(sin(phase),cos(phase*0.73+1.9))*0.10*drift;
        float mask=0.7*bedNoise((p+offset)*uBottomVariationScale)
          +0.3*bedNoise((p.yx-offset)*uBottomVariationScale*0.53+19.7);
        float variationFade=1.0-smoothstep(25.0,100.0,distanceToCamera);
        vec3 shallow=uBedColor*1.08;
        vec3 deep=uBedColor*vec3(0.76,0.79,0.82);
        vec3 bedColor=mix(uBedColor,mix(shallow,deep,smoothstep(0.15,0.85,mask)),
          uBottomVariationStrength*variationFade);
        // ごく弱い水中明度の移ろい。強いコースティクスや発光は使いません。
        float shimmer=(bedNoise(p*0.32+vec2(uTime*0.09,-uTime*0.07))-0.5)*0.035*drift;
        bedColor*=1.0+shimmer;
        gl_FragColor=vec4(bedColor*uEnvironmentLight*uEnvironmentIntensity*uEnvironmentGain*0.62,opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), material);
  bed.name = 'Shallow water bed';
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -0.65;
  // 空→底面→水面。水面側の既存の深度・描画順設定は維持します。
  bed.renderOrder = -1;
  return bed;
}


