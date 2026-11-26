import * as THREE from 'three';
import { createWeather } from './atlas-weather.js';

const presets = {
  day: {
    // West Lake, 10 April at 15:30 CST. 256.39° azimuth and 36.28° elevation.
    sky: 0xe0e9ec, hemisphere: 0xd6e8ff, ground: 0x808064, ambient: 1.72,
    key: 0xffebce, direct: 3.35, position: [-7.835, 5.917, 1.898], fill: 0xd1e5fe, fillPower: .26,
    water: 0x517f77, exposure: 1.08, blend: 0, shadowBias: -.000065, shadowNormalBias: .004,
    horizon: 0xbdcddd, fog: [10, 26, .68, 5.8], rain: 0, snow: 0, theme: '#eef2ef'
  },
  night: {
    sky: 0x182538, hemisphere: 0x9dbfff, ground: 0x394759, ambient: .87,
    key: 0xb8ceff, direct: 1.44, position: [-3.3, 6.2, -3.7], fill: 0xffc38d, fillPower: .31,
    water: 0x315675, exposure: 1.12, blend: 1, shadowBias: -.00016, shadowNormalBias: .012,
    horizon: 0x182538, fog: [10, 26, .68, 5.8], rain: 0, snow: 0, theme: '#152330'
  },
  rain: {
    sky: 0xa0b2b3, hemisphere: 0xd0dfe2, ground: 0x667568, ambient: 1.93,
    key: 0xd8e2e5, direct: .94, position: [-4, 7, 1.9], fill: 0xb7cad3, fillPower: .33,
    water: 0x3b6a6a, exposure: 1.08, blend: 0, shadowBias: -.000065, shadowNormalBias: .004,
    horizon: 0xb0c0c0, fog: [5.0, 21, .55, 5.3], rain: 1, snow: 0, theme: '#e6eeeb'
  },
  snow: {
    sky: 0xb8c8d1, hemisphere: 0xd6e6f8, ground: 0x828b96, ambient: 1.84,
    key: 0xf5f3ec, direct: 1.22, position: [-6, 7, 3], fill: 0xbfcfe1, fillPower: .26,
    water: 0x456f82, exposure: 1.03, blend: 0, shadowBias: -.000065, shadowNormalBias: .004,
    horizon: 0xc4d1d9, fog: [6.5, 25, .76, 6.8], rain: 0, snow: 1, theme: '#eef3f5'
  }
};

function addWaterLight(material, time, night, lightDirection, skyView, weather) {
  material.roughness = .27;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      lakeTime: time, nightMix: night, lakeLight: lightDirection, lakeSky: skyView,
      lakeRain: weather.rain, lakeSnow: weather.snow
    });
    shader.vertexShader = 'varying vec3 lakePosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      lakePosition = (modelMatrix * vec4(position, 1.0)).xyz;
    `);
    shader.fragmentShader = `
      uniform float lakeTime;
      uniform float nightMix;
      uniform vec3 lakeLight;
      uniform float lakeSky;
      uniform float lakeRain, lakeSnow;
      varying vec3 lakePosition;
      float rainCell(vec2 cell) {
        return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
      }
      ${shader.fragmentShader}
    `.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 p = lakePosition.xz;
      vec2 warped = p + .013 * vec2(sin(p.y * 17.0 + p.x * 12.0), cos(p.x * 24.0 - p.y * 9.0));
      vec2 waves = warped * mix(1.0, .63, lakeSky);
      float a = dot(waves, vec2(310.0, 965.0)) + lakeTime * 1.15 + sin(p.x * 39.0);
      float b = dot(waves, vec2(-481.0, 314.0)) - lakeTime * .97 + cos(p.y * 37.0);
      float c = dot(waves, vec2(150.0, -361.0)) + lakeTime * .78;
      a += lakeSky * sin(p.y * 43.0 + p.x * 34.0) * 1.7;
      b += lakeSky * sin(p.x * 61.0 - p.y * 21.0);
      float waveFade = (1.0 - smoothstep(.85, 4.8, distance(cameraPosition, lakePosition)))
                       * mix(1.0, .50, lakeSky);
      vec3 filtered = 1.0 - smoothstep(vec3(.45), vec3(2.1), fwidth(vec3(a, b, c)));
      vec3 rippleNormal = normalize(vec3(
        dot(vec3(sin(a) * .059, cos(b) * .024, cos(c) * .035), filtered) * waveFade,
        1.0,
        dot(vec3(cos(a) * .040, sin(b) * .026, sin(c) * .031), filtered) * waveFade
      ));
      if (lakeRain > .001) {
        vec2 stamp = p * 145.0;
        float seed = rainCell(floor(stamp));
        vec2 center = fract(stamp) - mix(vec2(.34), vec2(.66), vec2(seed, fract(seed * 29.1)));
        float radius = length(center);
        float phase = fract(lakeTime * .88 + seed);
        float ring = radius - phase * .44;
        float weight = exp(-ring * ring * 540.0) * (1.0 - phase)
                     * (1.0 - smoothstep(.31, .46, radius));
        rippleNormal.xz += center / max(radius, .02) * sin(ring * 43.0) * weight * waveFade * lakeRain * .2;
        rippleNormal = normalize(rippleNormal);
      }
      normal = normalize(mat3(viewMatrix) * rippleNormal);
    `).replace('#include <opaque_fragment>', `
      vec3 lakeEye = normalize(cameraPosition - lakePosition);
      float sheen = pow(1.0 - clamp(lakeEye.y, 0.0, 1.0), 3.0);
      vec3 lightHalf = normalize(lakeEye + lakeLight);
      float glint = pow(max(dot(rippleNormal, lightHalf), 0.0), mix(34.0, 44.0, nightMix));
      vec3 reflectedSky = mix(vec3(.36, .53, .61), vec3(.12, .24, .46), nightMix);
      vec3 glintColor = mix(vec3(1.0, .81, .52), vec3(.36, .55, .92), nightMix);
      reflectedSky = mix(reflectedSky, vec3(.42, .52, .55), lakeRain);
      reflectedSky = mix(reflectedSky, vec3(.54, .62, .72), lakeSnow);
      glintColor = mix(glintColor, reflectedSky * .72, max(lakeRain, lakeSnow) * .87);
      float glintStrength = mix(mix(.37, .28, nightMix), .12, max(lakeRain, lakeSnow));
      outgoingLight += reflectedSky * (.028 + sheen * .22) + glintColor * glint * glintStrength;
      #include <opaque_fragment>
    `);
  };
}

function createSkyDome(time, night, lightDirection, weather) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { time, night, lightDirection, rain: weather.rain, snow: weather.snow },
    vertexShader: `
      varying vec3 skyRay;
      void main() {
        skyRay = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float night;
      uniform float rain, snow;
      uniform vec3 lightDirection;
      varying vec3 skyRay;

      float hash(vec2 cell) {
        return fract(sin(dot(cell, vec2(126.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 point) {
        vec2 cell = floor(point);
        vec2 f = fract(point);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(cell), hash(cell + vec2(1,0)), f.x),
                   mix(hash(cell + vec2(0,1)), hash(cell + vec2(1,1)), f.x), f.y);
      }

      void main() {
        vec3 ray = normalize(skyRay);
        float elevation = max(ray.y, 0.0);
        float blue = pow(elevation, .45);
        vec3 day = mix(vec3(.72, .83, .94), vec3(.13, .39, .78), blue);
        vec2 skyPlane = ray.xz / (.33 + elevation) * 4.2 + vec2(time * .008, 0.0);
        float folds = .62 * noise(skyPlane) + .26 * noise(skyPlane * 2.03)
                    + .12 * noise(skyPlane * 4.18);
        float cloud = smoothstep(.51, .73, folds) * smoothstep(.025, .24, elevation) * .66;
        day = mix(day, vec3(1.28, 1.30, 1.34), cloud);

        vec3 sunAxis = normalize(lightDirection);
        float facing = max(dot(ray, sunAxis), 0.0);
        float angle = length(cross(ray, sunAxis));
        float disk = (1.0 - smoothstep(.0039, .0057, angle)) * step(.99, facing);
        day += vec3(1.0, .78, .49) * (pow(facing, 210.0) * .46 + disk * 9.0) * (1.0 - cloud * .8);
        float stratus = .62 * noise(skyPlane * .39 - vec2(.1, time * .004)) + .38 * folds;
        float banks = smoothstep(.28, .73, stratus) * smoothstep(.01, .26, elevation);
        vec3 rainSky = mix(vec3(.53, .64, .65), vec3(.18, .26, .30), elevation * .25 + banks * .75);
        vec3 snowSky = mix(vec3(.70, .79, .87), vec3(.37, .46, .57), elevation * .56 + banks * .44);
        day = mix(mix(day, rainSky, rain), snowSky, snow);
        vec3 afterDark = mix(vec3(.047, .081, .135), vec3(.012, .025, .067), blue);
        afterDark = mix(afterDark, vec3(.095, .143, .203), cloud * .5);
        gl_FragColor = vec4(mix(day, afterDark, night), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(35, 28, 16), material);
  dome.renderOrder = -100;
  dome.frustumCulled = false;
  dome.visible = false;
  return dome;
}

export function createLighting({ scene, renderer, hemisphere, sun, fill, water, reduced }) {
  const time = { value: 0 }, night = { value: 0 }, lightDirection = { value: new THREE.Vector3() };
  const skyView = { value: 0 }, sky = new THREE.Color();
  const fog = new THREE.Fog(0xe7eee9, 10, 26);
  scene.fog = fog;
  const weather = createWeather(scene, renderer, reduced);
  const dome = createSkyDome(time, night, lightDirection, weather);
  scene.add(dome);
  addWaterLight(water, time, night, lightDirection, skyView, weather);
  const lanterns = new THREE.Group();
  lanterns.name = 'Night_Lighting_Preview';
  lanterns.visible = false;
  scene.add(lanterns);
  const lanternIntensity = { value: 0 };

  let rendered, transition;
  function updateFog() {
    const offset = dome.visible ? 2 : 0;
    fog.near = rendered.fog[offset];
    fog.far = rendered.fog[offset + 1];
    fog.color.setHex(dome.visible ? rendered.horizon : rendered.sky);
  }

  function renderLighting(p) {
    rendered = p;
    hemisphere.color.setHex(p.hemisphere);
    hemisphere.groundColor.setHex(p.ground);
    hemisphere.intensity = p.ambient;
    sun.color.setHex(p.key);
    sun.intensity = p.direct;
    sun.position.set(...p.position);
    sun.shadow.bias = p.shadowBias;
    sun.shadow.normalBias = p.shadowNormalBias;
    lightDirection.value.copy(sun.position).normalize();
    fill.color.setHex(p.fill);
    fill.intensity = p.fillPower;
    water.color.setHex(p.water);
    sky.setHex(p.sky);
    renderer.setClearColor(sky);
    updateFog();
    renderer.toneMappingExposure = p.exposure;
    night.value = p.blend;
    lanternIntensity.value = p.blend;
    lanterns.visible = p.blend > .01;
    weather.rain.value = p.rain;
    weather.snow.value = p.snow;
  }

  function apply(mode) {
    const preset = presets[mode];
    if (rendered && !reduced) transition = { from: rendered, to: preset, start: performance.now() };
    else renderLighting(preset);
    document.documentElement.dataset.lighting = mode;
    document.querySelector('meta[name="theme-color"]').content = preset.theme;
  }

  const a = new THREE.Color(), b = new THREE.Color();
  function tween(from, to, progress) {
    const frame = {};
    for (const key of ['sky','hemisphere','ground','key','fill','water','horizon']) {
      frame[key] = a.setHex(from[key]).lerp(b.setHex(to[key]), progress).getHex();
    }
    for (const key of ['ambient','direct','fillPower','exposure','blend','shadowBias','shadowNormalBias','rain','snow']) {
      frame[key] = THREE.MathUtils.lerp(from[key], to[key], progress);
    }
    for (const key of ['position', 'fog']) {
      frame[key] = from[key].map((value, i) => THREE.MathUtils.lerp(value, to[key][i], progress));
    }
    return frame;
  }

  function addLanterns(roads, causewayWays, project, terrainAt) {
    const positions = [];
    for (const way of roads) {
      const causeway = causewayWays.has(String(way.id));
      if (!causeway && !['primary', 'secondary', 'tertiary', 'residential', 'pedestrian'].includes(way.kind)) continue;
      for (let i = 1; i < way.c.length; i++) {
        const [ax, az] = project(way.c[i - 1]), [bx, bz] = project(way.c[i]);
        const spacing = causeway ? .036 : .043;
        const count = Math.floor(Math.hypot(bx - ax, bz - az) / spacing);
        for (let j = 0; j < count; j++) {
          const mix = (j + .58) / count;
          const x = THREE.MathUtils.lerp(ax, bx, mix), z = THREE.MathUtils.lerp(az, bz, mix);
          const h = terrainAt(x, z);
          if (causeway || (x > .46 && h > .024)) positions.push(x, Math.max(h, .026) + .005, z);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { lampStrength: lanternIntensity, pixelRatio: { value: renderer.getPixelRatio() } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float pixelRatio;
        void main() {
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = pixelRatio * clamp(19.0 / max(-view.z, .25), 2.7, 15.0);
        }
      `,
      fragmentShader: `
        uniform float lampStrength;
        void main() {
          float r = length(gl_PointCoord - .5) * 2.0;
          float halo = (1.0 - smoothstep(.09, .93, r)) * .22;
          float core = (1.0 - smoothstep(0.0, .30, r)) * .75;
          gl_FragColor = vec4(vec3(1.0, .71, .35), (halo + core) * lampStrength);
        }
      `
    });
    lanterns.add(new THREE.Points(geometry, material));
  }

  const menu = document.querySelector('#lighting-options');
  for (const button of menu.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      apply(button.dataset.light);
      for (const sibling of menu.querySelectorAll('button')) sibling.setAttribute('aria-pressed', String(sibling === button));
    });
  }
  apply('day');
  return {
    addLanterns,
    weatherSurface: weather.surface,
    showSky(visible) {
      dome.visible = visible;
      skyView.value = visible ? 1 : 0;
      updateFog();
    },
    update(now, camera) {
      if (transition) {
        const elapsed = THREE.MathUtils.clamp((now - transition.start) / 480, 0, 1);
        renderLighting(elapsed === 1 ? transition.to : tween(transition.from, transition.to, 1 - (1 - elapsed) ** 3));
        if (elapsed === 1) transition = null;
      }
      if (!reduced) time.value = now / 1000;
      weather.update(time.value);
      if (dome.visible) dome.position.copy(camera.position);
    }
  };
}
