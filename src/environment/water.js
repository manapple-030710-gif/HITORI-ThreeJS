import * as THREE from 'three';
import { skyGLSL } from './sky.js';
import { waterVertexShader } from '../animation/water-vertex.js';

// 既存の自動補正量（水色12%、反射18%、光色14%）に掛ける距離係数。
export const imageColorDepth = {
  nearDistance: 12, middleDistance: 90, farDistance: 450,
  nearWeight: 0.15, middleWeight: 0.45, farWeight: 0.8,
  fogOnsetDistance: 35,
  horizonMatch: 0.75,
};

// 水面の見た目だけを調整。波の変位・速度・再生状態には触れません。
const waterAppearance = {
  capillarySlope: 0.026,
  bedBrightness: 0.88,
  opticalDepth: 0.75,
  bedVariation: 0.025,
};

export function createWater(uniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms,
    // 不透明の空を先に描画し、水平線に近い水面だけ背景へ溶かします。
    transparent: true,
    vertexShader: waterVertexShader,
    fragmentShader: `${skyGLSL}
      uniform float uTime;
      uniform float uStrength;
      uniform float uRoughness;
      uniform float uWaterOpacity;
      uniform float uFresnelStrength;
      uniform float uReflectionStrength;
      uniform float uDepthTint;
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
          vec3(1.0,0.99,0.96), uLightIntensity);
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
        vec2 slope=vec2(0.0);
        // ゆっくり変わる大小の不規則なうねりを、法線だけに重ねます。
        vec3 broad=noiseGradient(p*0.085+vec2(uTime*0.013,-uTime*0.009));
        float detailFade=1.0-smoothstep(12.0,65.0,distanceToCamera);
        float patchStrength=mix(0.65,1.0,broad.x);
        slope+=broad.yz*0.012*(1.0-smoothstep(0.3,1.5,footprint*0.085));
        // 近景の中波は位相を崩して重ね、長い帯より局所的な反射変化を出します。
        vec3 warp=noiseGradient(p*0.19+vec2(uTime*0.06,-uTime*0.04));
        for(int i=0;i<6;i++) {
          float fi=float(i), angle=fi*2.399963+0.73;
          vec2 dir=vec2(cos(angle),sin(angle));
          float k=0.55*pow(1.23,fi)*(0.88+0.24*hash(vec2(fi,9.7)));
          float fade=1.0-smoothstep(0.35,2.5,footprint*k);
          float phase=dot(p,dir)*k+warp.x*3.2+fi*7.31-uTime*sqrt(k)*1.8;
          slope+=cos(phase)*(dir+warp.yz*0.19*3.2/k)*(0.005/pow(1.08,fi))*fade*patchStrength*detailFade;
        }
        // 中小の不規則な4層。周波数は低めに保ち、シワ状の高周波を抑えます。
        float frequency=0.85, amplitude=${waterAppearance.capillarySlope}, unresolved=0.0;
        for(int i=0;i<4;i++) {
          float fi=float(i), angle=fi*1.713;
          mat2 rotation=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
          vec2 drift=vec2(cos(angle+0.6),sin(angle+0.6))*uTime*(0.25+fi*0.065);
          vec3 n=noiseGradient(rotation*p*frequency+drift+fi*13.7);
          float fade=(1.0-smoothstep(0.25,1.4,footprint*frequency))*detailFade;
          slope+=transpose(rotation)*n.yz*amplitude*fade*patchStrength;
          unresolved+=amplitude*amplitude*(1.0-fade*fade);
          frequency*=1.87;
          amplitude*=0.68;
        }
        // 大波だけを強調せず、実際のうねりと近景の中小波を合わせます。
        vec2 surfaceSlope = vSwellSlope + slope*min(uStrength,1.0);
        vec3 normal=normalize(vec3(-surfaceSlope.x,1.0,-surfaceSlope.y));
        vec3 view=normalize(cameraPosition-vWorld);
        normal=normalize(mix(vec3(0,1,0),normal,smoothstep(0.0,0.04,view.y)));
        float nv=max(dot(normal,view),0.001);
        vec3 reflected=reflect(-view,normal);
        float roughness=clamp(uRoughness+sqrt(unresolved)*uStrength
          +(broad.x-0.5)*0.035*detailFade*min(uStrength,1.0),0.04,0.65);
        // Integrate a broad sky lobe; unresolved detail becomes roughness, not sparkle.
        vec3 tangent=normalize(cross(abs(reflected.y)>0.99 ? vec3(1,0,0) : vec3(0,1,0),reflected));
        vec3 bitangent=cross(reflected,tangent);
        float spread=roughness*roughness*2.5;
        float imageWeight=mix(1.0,imageDepthWeight(distanceToCamera),uAutoImageFog);
        if (uWaterCorrectionMode == 1.0) imageWeight*=mix(1.0,0.5,uAutoImageFog);
        vec3 reflection=waterSkyColor(reflected,imageWeight)*0.40;
        reflection+=waterSkyColor(normalize(reflected+tangent*spread),imageWeight)*0.15;
        reflection+=waterSkyColor(normalize(reflected-tangent*spread),imageWeight)*0.15;
        reflection+=waterSkyColor(normalize(reflected+bitangent*spread),imageWeight)*0.15;
        reflection+=waterSkyColor(normalize(reflected-bitangent*spread),imageWeight)*0.15;
        // Schlick Fresnel for water (IOR 1.333, F0 0.0204).
        // 微細な法線の平均化をFresnelにも反映し、白い反射の張り付きを抑えます。
        float fresnelView=mix(nv,sqrt(nv),roughness*0.35);
        float fresnel=0.0204+0.9796*pow(1.0-fresnelView,5.0);
        fresnel=clamp(fresnel*uFresnelStrength,0.0,1.0);
        // 浅い水層を通った水底光を近似。背景を透かすアルファには依存しません。
        vec3 waterTint=mix(uBaseWaterColor,uWaterColor,imageWeight);
        vec3 lightTint=mix(uBaseLightColor,uEnvironmentLight,imageWeight);
        float refractedCos=sqrt(1.0-(1.0-nv*nv)/(1.333*1.333));
        float layerDepth=${waterAppearance.opticalDepth}+0.18*(broad.x-0.5)*uStrength;
        vec3 transmission=exp(-vec3(0.20,0.145,0.12)*layerDepth*uDepthTint/max(refractedCos,0.5));
        float bedDetail=(broad.x-0.5)*${waterAppearance.bedVariation}*detailFade*uStrength;
        vec3 bed=waterTint*(${waterAppearance.bedBrightness}+bedDetail);
        vec3 transmitted=(bed*transmission+waterTint*0.16*(vec3(1.0)-transmission))
          *lightTint*uEnvironmentIntensity;
        // 法線・波は変えず、材質の反射寄与だけ調整。遠方の反射を控えめに。
        float reflectionFade=mix(1.0,0.78,smoothstep(35.0,180.0,distanceToCamera));
        float reflectionWeight=clamp(fresnel*uReflectionStrength*reflectionFade,0.0,1.0);
        vec3 color=mix(transmitted,reflection,reflectionWeight);
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
        float bottomVisibility=(1.0-uWaterOpacity)*(1.0-reflectionWeight)*(1.0-fogAmount)
          *(1.0-smoothstep(18.0,60.0,distanceToCamera));
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
      uBedColor: { value: new THREE.Color('#e4e6e4') },
      uEnvironmentLight: uniforms.uEnvironmentLight,
      uEnvironmentIntensity: uniforms.uEnvironmentIntensity,
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
      uniform vec3 uEnvironmentLight;
      uniform float uEnvironmentIntensity;
      varying vec3 vBedWorld;
      void main() {
        // 水面の透過が消えた先で底も消し、水平線の背景合成を妨げません。
        float opacity=1.0-smoothstep(65.0,110.0,length(cameraPosition-vBedWorld));
        gl_FragColor=vec4(uBedColor*uEnvironmentLight*uEnvironmentIntensity*0.85,opacity);
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


