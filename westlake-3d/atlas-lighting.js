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

function addWaterLight(material, time, night, lightDirection) {
  material.roughness = .27;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { lakeTime: time, nightMix: night, lakeLight: lightDirection });
    shader.vertexShader = 'varying vec3 lakePosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      lakePosition = (modelMatrix * vec4(position, 1.0)).xyz;
    `);
    shader.fragmentShader = `
      uniform float lakeTime;
      uniform float nightMix;
      uniform vec3 lakeLight;
      varying vec3 lakePosition;
      ${shader.fragmentShader}
    `.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 p = lakePosition.xz;
      float a = dot(p, vec2(670.0, 1210.0)) + lakeTime * 1.15 + sin(p.x * 39.0);
      float b = dot(p, vec2(-2110.0, 460.0)) - lakeTime * 1.38 + cos(p.y * 37.0);
      float c = dot(p, vec2(340.0, -520.0)) + lakeTime * .78;
      float waveFade = 1.0 - smoothstep(.85, 4.8, distance(cameraPosition, lakePosition));
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

export function createLighting({ scene, renderer, hemisphere, sun, fill, water, reduced }) {
  const time = { value: 0 }, night = { value: 0 }, lightDirection = { value: new THREE.Vector3() };
  const sky = new THREE.Color();
  const fog = new THREE.Fog(0xe7eee9, 10, 26);
  scene.fog = fog;
  addWaterLight(water, time, night, lightDirection);
  const lanterns = new THREE.Group();
  lanterns.name = 'Night_Lighting_Preview';
  lanterns.visible = false;
  scene.add(lanterns);
  const lanternIntensity = { value: 0 };

  function apply(mode) {
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
    fog.color.copy(sky);
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
  return { addLanterns, update: now => { if (!reduced) time.value = now / 1000; } };
}
