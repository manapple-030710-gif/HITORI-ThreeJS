// Stable vertex deformation; appearance-only edits must not change this file.
export const waterVertexShader = `varying vec3 vWorld;
      varying vec2 vSwellSlope;
      uniform float uTime;
      uniform float uAmplitude;
      uniform float uWavelength;
      // Height and its analytic derivatives use identical phases.
      vec3 swell(vec2 p, vec2 direction, float scale, float weight, float offset) {
        vec2 dir = normalize(direction);
        float k = 6.28318530718 / (uWavelength * scale);
        // 波頭を横方向にゆるく曲げ、直線の山が並ぶ帯状パターンを崩します。
        // 位相の曲がりも微分に含め、高さと反射用の法線を一致させます。
        vec2 across = vec2(-dir.y,dir.x);
        float bendPhase = dot(p,across)*0.11 + uTime*0.17 + offset*2.3;
        float rate = 0.70 + 0.09*sin(offset*1.7);
        float phase = dot(p, dir)*k - uTime*sqrt(9.81*k)*rate + offset + 0.65*sin(bendPhase);
        vec2 phaseGradient = k*dir + 0.0715*cos(bendPhase)*across;
        return vec3(sin(phase), cos(phase)*phaseGradient) * weight;
      }
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec3 wave = swell(world.xz, vec2(1.0,0.35), 1.0, 0.36, 0.0)
          + swell(world.xz, vec2(-0.4,1.0), 0.81, 0.29, 1.8)
          + swell(world.xz, vec2(0.65,-0.8), 1.43, 0.24, 4.1)
          + swell(world.xz, vec2(-0.85,-0.25), 2.17, 0.22, 2.7);
        // Distant grid cells grow: fade displacement before it becomes undersampled.
        float distanceXZ = length(world.xz-cameraPosition.xz);
        float t = clamp((distanceXZ-45.0)/105.0,0.0,1.0);
        float envelope = 1.0-t*t*(3.0-2.0*t);
        vec2 envelopeGradient = (-6.0*t*(1.0-t)/105.0)
          * (world.xz-cameraPosition.xz)/max(distanceXZ,0.001);
        world.y += wave.x*uAmplitude*envelope;
        vSwellSlope = uAmplitude*(wave.yz*envelope+wave.x*envelopeGradient);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`;
