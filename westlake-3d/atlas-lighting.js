import * as THREE from 'three';

const presets = {
  day: {
    // West Lake, 10 April at 15:30 CST. 256.39° azimuth and 36.28° elevation.
    sky: 0xe0e9ec, hemisphere: 0xd6e8ff, ground: 0x808064, ambient: 1.72,
    key: 0xffebce, direct: 3.35, position: [-7.835, 5.917, 1.898], fill: 0xd1e5fe, fillPower: .26,
    water: 0x517f77, exposure: 1.08, blend: 0, shadowBias: -.000065, shadowNormalBias: .004
  },
  night: {
    sky: 0x182538, hemisphere: 0x9dbfff, ground: 0x394759, ambient: .87,
    key: 0xb8ceff, direct: 1.44, position: [-3.3, 6.2, -3.7], fill: 0xffc38d, fillPower: .31,
    water: 0x315675, exposure: 1.12, blend: 1, shadowBias: -.00016, shadowNormalBias: .012
  }
};

function addWaterLight(material, time, night, lightDirection, skyView) {
  material.roughness = .27;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { lakeTime: time, nightMix: night, lakeLight: lightDirection, lakeSky: skyView });
    shader.vertexShader = 'varying vec3 lakePosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      lakePosition = (modelMatrix * vec4(position, 1.0)).xyz;
    `);
    shader.fragmentShader = `
      uniform float lakeTime;
      uniform float nightMix;
      uniform vec3 lakeLight;
      uniform float lakeSky;
      varying vec3 lakePosition;
      ${shader.fragmentShader}
    `.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 p = lakePosition.xz;
      vec2 waves = p * mix(1.0, .46, lakeSky);
      float a = dot(waves, vec2(670.0, 1210.0)) + lakeTime * 1.15 + sin(p.x * 39.0);
      float b = dot(waves, vec2(-2110.0, 460.0)) - lakeTime * 1.38 + cos(p.y * 37.0);
      float c = dot(waves, vec2(340.0, -520.0)) + lakeTime * .78;
      a += lakeSky * sin(p.y * 43.0 + p.x * 34.0) * 1.4;
      b += lakeSky * sin(p.x * 61.0 - p.y * 21.0);
      float waveFade = (1.0 - smoothstep(.85, 4.8, distance(cameraPosition, lakePosition)))
                       * mix(1.0, .50, lakeSky);
      vec3 rippleNormal = normalize(vec3(
        (sin(a) * .065 + cos(b) * .036 + cos(c) * .032) * waveFade,
        1.0,
        (cos(a) * .051 + sin(b) * .028 + sin(c) * .026) * waveFade
      ));
      normal = normalize(mat3(viewMatrix) * rippleNormal);
    `).replace('#include <opaque_fragment>', `
      vec3 lakeEye = normalize(cameraPosition - lakePosition);
      float sheen = pow(1.0 - clamp(lakeEye.y, 0.0, 1.0), 3.0);
      vec3 lightHalf = normalize(lakeEye + lakeLight);
      float glint = pow(max(dot(rippleNormal, lightHalf), 0.0), mix(34.0, 44.0, nightMix));
      vec3 reflectedSky = mix(vec3(.36, .53, .61), vec3(.12, .24, .46), nightMix);
      vec3 glintColor = mix(vec3(1.0, .81, .52), vec3(.36, .55, .92), nightMix);
      outgoingLight += reflectedSky * (.028 + sheen * .22) + glintColor * glint * mix(.37, .28, nightMix);
      #include <opaque_fragment>
    `);
  };
}

function createSkyDome(time, night, lightDirection) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { time, night, lightDirection },
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
  const dome = createSkyDome(time, night, lightDirection);
  scene.add(dome);
  addWaterLight(water, time, night, lightDirection, skyView);
  const lanterns = new THREE.Group();
  lanterns.name = 'Night_Lighting_Preview';
  lanterns.visible = false;
  scene.add(lanterns);
  const lanternIntensity = { value: 0 };

  let currentMode = 'day';
  function updateFog() {
    fog.near = dome.visible ? .68 : 10;
    fog.far = dome.visible ? 5.8 : 26;
    fog.color.setHex(dome.visible && currentMode === 'day' ? 0xbdcddd : presets[currentMode].sky);
  }

  function apply(mode) {
    currentMode = mode;
    const p = presets[mode];
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
    lanterns.visible = mode === 'night';
    document.documentElement.dataset.lighting = mode;
    document.querySelector('meta[name="theme-color"]').content = mode === 'day' ? '#eef2ef' : '#152330';
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
    showSky(visible) {
      dome.visible = visible;
      skyView.value = visible ? 1 : 0;
      updateFog();
    },
    update(now, camera) {
      if (!reduced) time.value = now / 1000;
      if (dome.visible) dome.position.copy(camera.position);
    }
  };
}
