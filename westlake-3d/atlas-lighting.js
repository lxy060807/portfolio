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
    sky: 0x080d17, hemisphere: 0x9fb6dd, ground: 0x302c36, ambient: .19,
    key: 0xb2c7e7, direct: .27, position: [-3.3, 6.2, -3.7], fill: 0xe6b68e, fillPower: .065,
    water: 0x1c2936, exposure: .85, blend: 1, shadowBias: -.00016, shadowNormalBias: .008,
    horizon: 0x101622, fog: [13, 29, 1.8, 8.5], rain: 0, snow: 0, theme: '#152330'
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

const shoreReflectionCount = 8;

function addWaterLight(material, time, night, lightDirection, skyView, weather, shoreLights) {
  material.roughness = .27;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      lakeTime: time, nightMix: night, lakeLight: lightDirection, lakeSky: skyView,
      lakeRain: weather.rain, lakeSnow: weather.snow, shoreLights
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
      uniform vec4 shoreLights[${shoreReflectionCount}];
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
      vec3 reflectedSky = mix(vec3(.36, .53, .61), vec3(.032, .054, .090), nightMix);
      vec3 glintColor = mix(vec3(1.0, .81, .52), vec3(.36, .55, .92), nightMix);
      reflectedSky = mix(reflectedSky, vec3(.42, .52, .55), lakeRain);
      reflectedSky = mix(reflectedSky, vec3(.54, .62, .72), lakeSnow);
      glintColor = mix(glintColor, reflectedSky * .72, max(lakeRain, lakeSnow) * .87);
      float glintStrength = mix(mix(.37, .035, nightMix), .12, max(lakeRain, lakeSnow));
      outgoingLight += reflectedSky * (.028 + sheen * .22) + glintColor * glint * glintStrength;
      if (nightMix > .001) {
        vec2 toEye = normalize(lakeEye.xz + vec2(.0001));
        vec2 crossView = vec2(-toEye.y, toEye.x);
        float reflections = 0.0;
        for (int i = 0; i < ${shoreReflectionCount}; i++) {
          vec4 source = shoreLights[i];
          float height = max(.007, source.y - lakePosition.y);
          float mirror = height / (height + max(.001, cameraPosition.y - lakePosition.y));
          vec2 offset = p - mix(source.xz, cameraPosition.xz, mirror);
          float streak = dot(offset, toEye) / mix(.022, .092, sheen);
          float across = dot(offset, crossView) / .008 + rippleNormal.x * 17.0;
          reflections += exp(-across * across - streak * streak) * source.w;
        }
        float ripple = .56 + .44 * sin(dot(p, toEye) * 640.0 + cos(p.x * 190.0) + lakeTime * .85);
        outgoingLight += vec3(1.0, .57, .23) * nightMix * reflections * mix(.012, .17, sheen) * ripple;
      }
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
        vec3 afterDark = mix(vec3(.015, .022, .038), vec3(.002, .005, .014), blue);
        afterDark = mix(afterDark, vec3(.027, .035, .050), cloud * .43);
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
  const shoreLights = { value: Array.from({ length: shoreReflectionCount }, () => new THREE.Vector4()) };
  addWaterLight(water, time, night, lightDirection, skyView, weather, shoreLights);
  const lanterns = new THREE.Group();
  lanterns.name = 'Mapped_Night_Lighting';
  lanterns.visible = false;
  scene.add(lanterns);
  const landmarkMaterials = [];
  const facadeLights = { positions: [], styles: [] };
  let shoreline, facadeLayer, streetLayer, baoshiLayer;

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
    lanterns.visible = p.blend > .01;
    if (shoreline) shoreline.opacity = 1 - .91 * p.blend;
    for (const [material, strength] of landmarkMaterials) material.emissiveIntensity = strength * p.blend;
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

  const seedAt = (x, z) => {
    const noise = Math.sin(x * 781.71 + z * 1231.53) * 10312.715;
    return noise - Math.floor(noise);
  };
  const isCity = ([lon, lat]) => (lon > 120.148 && lat > 30.227) || (lat > 30.266 && lon > 120.116);
  const center = new THREE.Vector2();
  const mix = THREE.MathUtils.lerp;

  function addFacade(ax, az, bx, bz, top, height, urbanLimits) {
    const [east, south, north, northwest] = urbanLimits;
    if (!((ax > east && az < south) || (az < north && ax > northwest))) return;
    const length = Math.hypot(bx - ax, bz - az);
    if (length < .006 || seedAt(ax, az) < .24) return;
    const columns = Math.min(9, Math.max(1, Math.ceil(length / .011)));
    const floors = Math.min(10, Math.max(1, Math.round(height / .009)));
    for (let col = 0; col < columns; col++) {
      const offset = (col + .5) / columns;
      // Move outside the wall very slightly so the illuminated windows depth-test against the building.
      const x = mix(ax, bx, offset) + (bz - az) / length * .00035;
      const z = mix(az, bz, offset) - (bx - ax) / length * .00035;
      for (let floor = 0; floor < floors; floor++) {
        const seed = seedAt(x + floor * .014, z);
        if (seed < .48) continue;
        facadeLights.positions.push(x, top - height * (floor + .45) / floors, z);
        facadeLights.styles.push(.19 + seed * .52, .90 + seed * .37, .35 + seed * .59);
      }
    }
  }

  function addPoints({ positions, styles }, name) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('lamp', new THREE.Float32BufferAttribute(styles, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { night, pointScale: { value: renderer.getPixelRatio() * (renderer.getSize(center).x < 600 ? .8 : 1) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float pointScale;
        attribute vec3 lamp;
        varying vec3 lampStyle;
        void main() {
          lampStyle = lamp;
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * view;
          gl_PointSize = pointScale * clamp(lamp.y * (2.2 + 13.0 / max(-view.z, .15)), 1.8, 13.0);
        }
      `,
      fragmentShader: `
        uniform float night;
        varying vec3 lampStyle;
        void main() {
          float r = length(gl_PointCoord - .5) * 2.0;
          float halo = exp(-r * r * 5.8) * (1.0 - smoothstep(.60, .98, r)) * .34;
          float core = exp(-r * r * 22.0) * .92;
          vec3 color = mix(vec3(1.0, .63, .30), vec3(1.0, .94, .81), lampStyle.z);
          gl_FragColor = vec4(color, min(1.0, (halo + core) * night * lampStyle.x));
        }
      `
    });
    const points = new THREE.Points(geometry, material);
    points.name = name;
    lanterns.add(points);
    return points;
  }

  function populateRoads(roads, causewayWays, project, terrainAt, inWater, bounds) {
    const street = { positions: [], styles: [] };
    const shore = [];
    const take = new Set();
    const [west, south, east, north] = bounds;
    for (const way of roads) {
      if (way.tunnel || Number(way.layer) < 0) continue;
      const causeway = causewayWays.has(String(way.id));
      const waterfront = /^(北山街|湖滨路|南山路|孤山路|杨公堤)$/.test(way.name);
      const trunk = /^(trunk|primary|secondary)(_link)?$/.test(way.kind);
      const local = /^(tertiary|residential|unclassified|living_street|pedestrian|service)$/.test(way.kind);
      if (!(causeway || waterfront || trunk || local)) continue;
      const spacing = causeway ? .060 : waterfront ? .026 : trunk ? .020 : .027;
      let next = spacing * (.35 + .5 * seedAt(...way.c[0]));
      for (let i = 1; i < way.c.length; i++) {
        const from = way.c[i - 1], to = way.c[i];
        const [ax, az] = project(from), [bx, bz] = project(to);
        const length = Math.hypot(bx - ax, bz - az);
        if (length > .8) { next = spacing; continue; }
        for (; next < length; next += spacing) {
          const fraction = next / length;
          const lon = mix(from[0], to[0], fraction), lat = mix(from[1], to[1], fraction);
          if (lon < west || lon > east || lat < south || lat > north) continue;
          const urban = isCity([lon, lat]);
          const seed = seedAt(lon, lat);
          if (!(causeway || waterfront || urban || (trunk && seed > .58))) continue;
          if (way.kind === 'service' && seed < .68) continue;
          const x = mix(ax, bx, fraction), z = mix(az, bz, fraction);
          if (!causeway && !way.bridge && inWater(x, z)) continue;
          const h = terrainAt(x, z);
          if (!waterfront && !causeway && h > .115) continue;
          const key = `${Math.round(x / .011)}:${Math.round(z / .011)}`;
          if (take.has(key)) continue;
          take.add(key);
          const y = Math.max(h + (trunk ? .012 : .009), way.bridge ? .064 : .032);
          street.positions.push(x, y, z);
          const strength = (causeway ? .34 : waterfront ? .88 : trunk ? 1.13 : .66) * (.64 + .58 * seed);
          street.styles.push(strength, trunk ? 1.35 : waterfront ? 1.18 : 1.00, waterfront ? .19 : seed * .67);
          if (waterfront && [0, 1, 2, 3].some(n => inWater(x + .033 * Math.cos(n * Math.PI / 2), z + .033 * Math.sin(n * Math.PI / 2)))) {
            shore.push([x, y, z, strength]);
          }
        }
        next -= length;
      }
    }
    // Keep reflection sources distinct and directly attached to the mapped shoreline corridors.
    const reflectionSources = [];
    for (const source of shore.sort((a, b) => b[3] - a[3])) {
      if (reflectionSources.some(other => Math.hypot(source[0] - other[0], source[2] - other[2]) < .35)) continue;
      shoreLights.value[reflectionSources.length].set(...source);
      reflectionSources.push(source);
      if (reflectionSources.length === shoreReflectionCount) break;
    }
    streetLayer = addPoints(street, 'Mapped_Street_Lights');
  }

  function addBaoshiTreeLights(paths, terrainAt, canPlant) {
    const lights = { positions: [], styles: [] };
    const trees = [], pools = [];
    for (const [pathIndex, path] of paths.entries()) {
      const branch = pathIndex > 0;
      let next = branch ? .019 + .026 * seedAt(...path[0]) : .009;
      for (let i = 1; i < path.length; i++) {
        const [ax, az] = path[i - 1], [bx, bz] = path[i];
        const length = Math.hypot(bx - ax, bz - az);
        while (next < length) {
          const x = mix(ax, bx, next / length), z = mix(az, bz, next / length);
          const seed = seedAt(x, z), spread = seedAt(x + .49, z - .71);
          next += branch ? .042 + seed * .046 : .019 + seed * .029;
          const distance = .009 + spread * spread * .024;
          const side = seedAt(x - .27, z + .16) < .5 ? -1 : 1;
          const dx = (bz - az) / length * distance * side;
          const dz = (ax - bx) / length * distance * side;
          const sign = canPlant(x + dx, z + dz) ? 1 : -1;
          const tx = x + dx * sign, tz = z + dz * sign;
          if (!canPlant(tx, tz) || trees.some(({x: px, z: pz}) => (px - tx) ** 2 + (pz - tz) ** 2 < .018 ** 2)) continue;
          const y = terrainAt(tx, tz);
          const size = .0088 + seed * .004;
          const reach = Math.min(.88, size / distance);
          const lampX = mix(tx, x, reach), lampY = y + size * 1.58, lampZ = mix(tz, z, reach);
          trees.push({ x: tx, z: tz, y, size, lampX, lampY, lampZ });
          lights.positions.push(lampX, lampY, lampZ);
          lights.styles.push(.64 + seed * .73, 1.05 + seed * .52, .22 + spread * .44);
          const spill = Math.min(.72, .014 / distance);
          pools.push([mix(tx, x, spill), mix(tz, z, spill), .008 + seed * .006]);
        }
        next -= length;
      }
    }
    const bulbs = addPoints(lights, 'Baoshi_Tree_Lights');
    bulbs.userData.trees = trees;
    baoshiLayer = new THREE.Group();
    baoshiLayer.name = 'Baoshi_Woodland_Lighting';
    baoshiLayer.add(bulbs, createTrailLightPools(pools, terrainAt));
    lanterns.add(baoshiLayer);
    return trees;
  }

  function createTrailLightPools(pools, terrainAt) {
    const positions = [], falloff = [], indices = [];
    const divisions = 6;
    for (const [x, z, radius] of pools) {
      for (let row = 0; row <= divisions; row++) {
        for (let column = 0; column <= divisions; column++) {
          const u = column / divisions * 2 - 1, v = row / divisions * 2 - 1;
          const px = x + u * radius, pz = z + v * radius;
          const index = positions.length / 3;
          positions.push(px, terrainAt(px, pz) + .006, pz);
          falloff.push(Math.max(0, 1 - u * u - v * v) ** 2);
          if (row && column) indices.push(index, index - divisions - 1, index - 1, index - 1, index - divisions - 1, index - divisions - 2);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('falloff', new THREE.Float32BufferAttribute(falloff, 1));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      uniforms: { night }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float falloff;
        varying float groundLight;
        void main() { groundLight = falloff; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float night;
        varying float groundLight;
        void main() { gl_FragColor = vec4(.95, .76, .48, groundLight * night * .24); }
      `
    });
    const wash = new THREE.Mesh(geometry, material);
    wash.name = 'Baoshi_Trail_Light_Pools';
    return wash;
  }

  function lightLandmark(object, color, strength) {
    const replacements = new Map();
    object.traverse(child => {
      if (!child.isMesh) return;
      const original = child.material;
      if (!replacements.has(original)) {
        const material = original.clone();
        material.emissive.set(color).lerp(original.color, .38);
        material.emissiveIntensity = 0;
        material.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
            float facadeLight = smoothstep(-.76, .65, dot(worldNormal, normalize(vec3(.41, -.27, .89))));
            totalEmissiveRadiance *= mix(.18, 1.0, facadeLight);
          `);
        };
        replacements.set(original, material);
        landmarkMaterials.push([material, strength]);
      }
      child.material = replacements.get(original);
    });
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
    addFacade, populateRoads, lightLandmark, addBaoshiTreeLights,
    lightCanopies(material) {
      material.emissive.setHex(0xe3b383).lerp(material.color, .23);
      material.emissiveIntensity = 0;
      landmarkMaterials.push([material, .64]);
      const compile = material.onBeforeCompile;
      const key = material.customProgramCacheKey();
      material.customProgramCacheKey = () => key + ':baoshi-canopy';
      material.onBeforeCompile = shader => {
        compile.call(material, shader);
        shader.vertexShader = 'attribute float canopyLamp; varying float canopyGlow;\n' +
          shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n canopyGlow = canopyLamp;');
        shader.fragmentShader = 'varying float canopyGlow;\n' +
          shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= canopyGlow;');
      };
    },
    finishFacades() { facadeLayer = addPoints(facadeLights, 'Mapped_Facade_Windows'); },
    dimShoreline(material) { shoreline = material; shoreline.transparent = true; shoreline.depthWrite = false; },
    weatherSurface: weather.surface,
    showSky(visible) {
      dome.visible = visible;
      skyView.value = visible ? 1 : 0;
      updateFog();
    },
    update(now, camera, layers) {
      if (transition) {
        const elapsed = THREE.MathUtils.clamp((now - transition.start) / 480, 0, 1);
        renderLighting(elapsed === 1 ? transition.to : tween(transition.from, transition.to, 1 - (1 - elapsed) ** 3));
        if (elapsed === 1) transition = null;
      }
      if (!reduced) time.value = now / 1000;
      weather.update(time.value);
      if (dome.visible) dome.position.copy(camera.position);
      if (lanterns.visible && facadeLayer && streetLayer) {
        facadeLayer.visible = layers.Buildings.visible;
        streetLayer.visible = layers.Roads.visible;
        if (baoshiLayer) baoshiLayer.visible = layers.Trees.visible;
      }
    }
  };
}
