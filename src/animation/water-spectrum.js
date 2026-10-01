// Shared finite spectrum: x=height, yz=analytic gradient. No FFT or extra textures.
export const waterSpectrumGLSL = `
uniform float uTime;
uniform float uAmplitude;
uniform float uLargeWaveStrength;
uniform float uLargeWaveScale;
uniform float uLargeWaveSpeed;
uniform float uMediumWaveStrength;
uniform float uMediumWaveScale;
uniform float uMediumWaveSpeed;
uniform float uSmallWaveStrength;
uniform float uSmallWaveScale;
uniform float uSmallWaveSpeed;
uniform float uWaveDirectionSpread;
uniform float uWaveSpeedVariation;
uniform float uWaveSharpness;
float spectrumSeed(float x) { return fract(sin(x*127.1+311.7)*43758.5453); }
vec3 spectrumBand(vec2 p,float scale,float speed,float seed,int count,float footprint) {
  vec3 result=vec3(0.0);
  float weightSum=0.0;
  vec2 delta=p-cameraPosition.xz;
  float distanceXZ=length(delta);
  for(int i=0;i<9;i++) {
    if(i>=count) break;
    float fi=float(i), id=fi+seed;
    float wavelength=scale*exp2((spectrumSeed(id)-0.5)*1.7);
    float k=6.28318530718/wavelength;
    float angle=0.34+(fi*2.399963+seed*0.73)*uWaveDirectionSpread;
    vec2 direction=vec2(cos(angle),sin(angle)),across=vec2(-direction.y,direction.x);
    float rate=exp2((spectrumSeed(id+41.0)-0.5)*uWaveSpeedVariation*1.3);
    float time=uTime*speed*rate;
    float bendK=k*0.19;
    float bend=dot(p,across)*bendK-time*0.21+id*2.13;
    float phase=dot(p,direction)*k-time*sqrt(9.81*k)+id*7.31+0.45*sin(bend);
    vec2 phaseGradient=k*direction+0.45*bendK*cos(bend)*across;
    float sharp=0.26*uWaveSharpness;
    float height=(sin(phase)-sharp*cos(2.0*phase))/(1.0+sharp);
    vec2 gradient=(cos(phase)+2.0*sharp*sin(2.0*phase))*phaseGradient/(1.0+sharp);
    float start=clamp(wavelength*3.0,8.0,55.0),end=clamp(wavelength*12.0,35.0,240.0);
    float t=clamp((distanceXZ-start)/(end-start),0.0,1.0);
    float envelope=1.0-t*t*(3.0-2.0*t);
    vec2 envelopeGradient=-6.0*t*(1.0-t)/(end-start)*delta/max(distanceXZ,0.001);
    float pixelFade=1.0-smoothstep(0.5,2.0,footprint*k*(1.0+uWaveSharpness));
    float weight=mix(0.6,1.0,spectrumSeed(id+17.0));
    result+=vec3(height*envelope,gradient*envelope+height*envelopeGradient)*weight*pixelFade;
    weightSum+=weight;
  }
  return result/weightSum;
}
vec3 displacedSpectrum(vec2 p, float footprint) {
  vec3 large=spectrumBand(p,uLargeWaveScale,uLargeWaveSpeed,1.0,3,footprint);
  vec3 medium=spectrumBand(p,uMediumWaveScale,uMediumWaveSpeed,11.0,7,footprint);
  vec3 wave=uAmplitude*(large*0.4*uLargeWaveStrength+medium*0.5*uMediumWaveStrength);
  // Smooth height limit below 0.5; derivative follows the same mapping.
  float limit=sqrt(1.0+wave.x*wave.x/0.25);
  return vec3(wave.x/limit,wave.yz/(limit*limit*limit));
}
`;
