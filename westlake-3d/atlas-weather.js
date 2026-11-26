import * as THREE from 'three';

export function createWeather(scene, renderer, reduced) {
  const rain = { value: 0 }, snow = { value: 0 }, clock = { value: 0 };
  const field = new THREE.Group();
  field.name = 'Weather_Precipitation';
  scene.add(field);

  function particles(count, strength, flakes) {
    let seed = flakes ? 1991 : 1237;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < positions.length; i++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      positions[i] = seed / 4294967296;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { strength, clock, pixelRatio: { value: renderer.getPixelRatio() } },
      defines: { FLAKES: flakes ? 1 : 0 },
      transparent: true, depthWrite: false, fog: false, toneMapped: false,
      vertexShader: `
        uniform float clock;
        uniform float pixelRatio;
        varying float detail;
        void main() {
          float size = mix(.26, 1.0, pow(position.z, 2.9));
          float depth = mix(2.1, .25, size);
          float phase = clock * mix(.65, 1.1, size);
          #if FLAKES
            vec2 wind = vec2(.033, -.12) * phase + vec2(.025 * sin(phase * 1.7 + position.z * 36.0), 0.0);
            gl_PointSize = pixelRatio * mix(2.0, 8.0, size);
          #else
            vec2 wind = vec2(.25, -1.38) * phase;
            gl_PointSize = pixelRatio * mix(5.0, 25.0, size);
          #endif
          vec2 screen = (fract(position.xy + wind) * 2.0 - 1.0) * 1.075;
          vec2 shift = vec2(projectionMatrix[2][0], projectionMatrix[2][1]);
          vec2 view = depth * (screen + shift) / vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
          gl_Position = projectionMatrix * vec4(view, -depth, 1.0);
          detail = size;
        }
      `,
      fragmentShader: `
        uniform float strength;
        varying float detail;
        void main() {
          vec2 p = gl_PointCoord - .5;
          #if FLAKES
            float fade = 1.0 - smoothstep(.08, .49, length(p));
            vec3 ink = vec3(.91, .95, 1.0);
            float opacity = mix(.34, .71, detail);
          #else
            float fade = (1.0 - smoothstep(.016, .075, abs(p.x + p.y * .18)))
                       * (1.0 - smoothstep(.18, .48, abs(p.y)));
            vec3 ink = vec3(.72, .84, .90);
            float opacity = mix(.16, .42, detail);
          #endif
          gl_FragColor = vec4(ink, strength * opacity * fade);
        }
      `
    });
    const mesh = new THREE.Points(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.renderOrder = 3;
    field.add(mesh);
    return mesh;
  }

  const drops = reduced ? null : particles(1350, rain, false);
  const flakes = reduced ? null : particles(530, snow, true);
  const surfaces = new Set();

  function surface(material, coverage, wetness) {
    if (surfaces.has(material)) return;
    surfaces.add(material);
    material.customProgramCacheKey = () => 'westlake-weather-surface';
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, {
        weatherRain: rain, weatherSnow: snow, snowCoverage: { value: coverage }, rainWetness: { value: wetness }
      });
      shader.vertexShader = 'varying vec3 weatherPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        weatherPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      `);
      shader.fragmentShader = `
        uniform float weatherRain, weatherSnow, snowCoverage, rainWetness;
        varying vec3 weatherPosition;
        float snowHash(vec2 p) {
          vec3 q = fract(vec3(p.xyx) * .1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }
        float snowNoise(vec2 p) {
          vec2 cell = floor(p), t = fract(p);
          t = t * t * (3.0 - 2.0 * t);
          return mix(mix(snowHash(cell), snowHash(cell + vec2(1,0)), t.x),
                     mix(snowHash(cell + vec2(0,1)), snowHash(cell + vec2(1,1)), t.x), t.y);
        }
        ${shader.fragmentShader}
      `.replace('#include <normal_fragment_maps>', `
        #include <normal_fragment_maps>
        float upward = inverseTransformDirection(normal, viewMatrix).y;
        if (weatherRain > .001) {
          float damp = weatherRain * rainWetness;
          diffuseColor.rgb *= mix(1.0, .61, damp);
          roughnessFactor = mix(roughnessFactor, .24, damp * smoothstep(.05, .85, upward));
        }
        if (weatherSnow > .001) {
          vec2 p = weatherPosition.xz;
          float grain = .72 * snowNoise(p * 37.0) + .28 * snowNoise(p * 141.0 + 9.0);
          float deposit = smoothstep(.33, .9, upward) * smoothstep(.14, .72, grain + snowCoverage * .19);
          float cover = deposit * snowCoverage * weatherSnow;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.88, .92, .95), cover);
          roughnessFactor = mix(roughnessFactor, .86, cover);
        }
      `);
    };
  }

  return {
    rain, snow, surface,
    update(seconds) {
      clock.value = seconds;
      if (drops) drops.visible = rain.value > .01;
      if (flakes) flakes.visible = snow.value > .01;
    }
  };
}
